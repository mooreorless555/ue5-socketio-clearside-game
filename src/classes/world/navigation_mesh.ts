import * as BABYLON from '@babylonjs/core';
import { readFile } from 'fs/promises';
import { Agent } from '../agent';
import { VectorBuilder } from './vector_builder';
import { XYZ } from '../../utils/types';
import assert from 'assert';
import {
  distinctUntilChanged,
  first,
  interval,
  map,
  of,
  Subject,
  takeUntil,
} from 'rxjs';

export class NavigationMesh {
  private readonly navigationPlugin = new BABYLON.RecastJSPlugin();
  private crowd?: BABYLON.ICrowd;
  private meshes: BABYLON.Mesh[] = [];

  private agentIdToIndex = new Map<string, number>();
  private isLoaded: boolean = false;

  constructor(private readonly scene: BABYLON.Scene) {}

  public async init(filename: string) {
    const meshes = await this.loadObjMesh(`public/navmesh/${filename}`);
    // Including the first mesh causes a memory out of bounds
    // error when constructing the static mesh.
    const [, ...restMeshes] = meshes;
    this.navigationPlugin.createNavMesh(
      restMeshes as BABYLON.Mesh[],
      NAV_MESH_PARAMETERS
    );
    this.meshes = restMeshes as BABYLON.Mesh[];
    this.crowd = this.navigationPlugin.createCrowd(10, 200, this.scene);
    this.isLoaded = true;
    console.log('Nav mesh created.');
  }

  public hasLoaded(): boolean {
    return this.isLoaded;
  }

  public async addAgent(agent: Agent): Promise<NavMeshAgent> {
    assert(this.crowd, 'Crowd has not initialized yet.');
    const agentCube = BABYLON.MeshBuilder.CreateBox(
      'cube',
      {
        size: 400,
      },
      this.scene
    );

    const agentBabylonPosition = VectorBuilder.fromXYZ(agent.getPosition())
      .toBabylon()
      .toIntersectWithMesh(this.meshes)
      .asVector3();

    const transformNode = new BABYLON.TransformNode(agent.getId());
    agentCube.parent = transformNode;

    // Add the agent to the crowd.
    const agentIndex = this.crowd.addAgent(
      agentBabylonPosition,
      AGENT_PARAMETERS,
      transformNode
    );
    this.agentIdToIndex.set(agent.getId(), agentIndex);

    const navMeshAgent = new NavMeshAgent(this.crowd, this.meshes, agentIndex);
    return navMeshAgent;
  }

  private async loadObjMesh(filename: string): Promise<BABYLON.AbstractMesh[]> {
    return new Promise(async (resolve) => {
      const onError = (err) => {
        console.error('Mesh loading error.');
        resolve([]);
      };
      const onSuccess: BABYLON.SceneLoaderSuccessCallback = (meshes) => {
        resolve(meshes);
      };
      const file = await readFile(filename, 'utf8');
      const objString = `data: ${file}`;
      BABYLON.SceneLoader.ImportMesh(
        '',
        '',
        objString,
        this.scene,
        onSuccess,
        undefined,
        onError,
        '.obj'
      );
    });
  }
}

/**
 * Taken and modified from
 * https://doc.babylonjs.com/features/featuresDeepDive/crowdNavigation/createNavMesh
 */
const NAV_MESH_PARAMETERS: BABYLON.INavMeshParameters = {
  cs: 10,
  ch: 10,
  walkableSlopeAngle: 60,
  walkableHeight: 10,
  walkableClimb: 20,
  walkableRadius: 5,
  maxEdgeLen: 100,
  maxSimplificationError: 1,
  minRegionArea: 8,
  mergeRegionArea: 2,
  maxVertsPerPoly: 3,
  detailSampleDist: 6,
  detailSampleMaxError: 1,
};

/** Taken and modified from some Babylon.JS playground. */
const AGENT_PARAMETERS: BABYLON.IAgentParameters = {
  radius: 100,
  height: 100,
  maxAcceleration: 2000.0,
  maxSpeed: 600.0,
  collisionQueryRange: 300,
  pathOptimizationRange: 0.0,
  separationWeight: 1.0,
};

export class NavMeshAgent {
  complete$ = new Subject<void>();

  constructor(
    private readonly crowd: BABYLON.ICrowd,
    private readonly meshes: BABYLON.Mesh[],
    private readonly agentIndex: number
  ) {}

  cancel() {
    this.complete$.next();
  }

  teleport(destination: XYZ) {
    const babylonVector = VectorBuilder.fromXYZ(destination)
      .toBabylon()
      .toIntersectWithMesh(this.meshes)
      .asVector3();
    this.crowd.agentTeleport(this.agentIndex, babylonVector);
  }

  move(
    destination: XYZ,
    onTick: (position: XYZ, velocity: XYZ, nextTarget: XYZ) => void,
    onNextTarget: (position: XYZ, nextTarget: XYZ) => void,
    onDone?: () => void
  ) {
    const babylonVector = VectorBuilder.fromXYZ(destination)
      .toBabylon()
      .toIntersectWithMesh(this.meshes)
      .asVector3();

    console.log('Destination: ', babylonVector);
    this.crowd.agentGoto(this.agentIndex, babylonVector);

    const getVectors = () => {
      const velocity = this.crowd.getAgentVelocity(this.agentIndex);
      const position = this.crowd.getAgentPosition(this.agentIndex);
      const nextTarget = this.crowd.getAgentNextTargetPath(this.agentIndex);

      const unrealPositionVector = VectorBuilder.fromBabylon(position)
        .toUnreal()
        .asXYZ();
      const unrealVelocityVector = VectorBuilder.fromBabylon(velocity)
        .toUnreal()
        .asXYZ();

      const unrealNextTargetVector = VectorBuilder.fromBabylon(nextTarget)
        .toUnreal()
        .asXYZ();

      return {
        unrealNextTargetVector,
        unrealVelocityVector,
        unrealPositionVector,
      };
    };

    interval(1000 / 60)
      .pipe(
        takeUntil(this.complete$),
        map(() => this.crowd.getAgentNextTargetPath(this.agentIndex)),
        map((vector) => VectorBuilder.fromBabylon(vector).toString()),
        distinctUntilChanged()
      )
      .subscribe(() => {
        const { unrealPositionVector, unrealNextTargetVector } = getVectors();
        onNextTarget(unrealPositionVector, unrealNextTargetVector);
      });

    interval(1000 / 60)
      .pipe(takeUntil(this.complete$))
      .subscribe(() => {
        const { unrealPositionVector } = getVectors();
        const currentPosition =
          VectorBuilder.fromXYZ(unrealPositionVector).asVector3();
        const destinationVec3 = VectorBuilder.fromXYZ(destination).asVector3();
        if (BABYLON.Vector3.Distance(currentPosition, destinationVec3) < 100) {
          this.complete$.next();
        }
      });

    interval(1000 / 60)
      .pipe(takeUntil(this.complete$))
      .subscribe(() => {
        const {
          unrealPositionVector,
          unrealVelocityVector,
          unrealNextTargetVector,
        } = getVectors();

        onTick(
          unrealPositionVector,
          unrealVelocityVector,
          unrealNextTargetVector
        );
      });

    this.complete$.pipe(first()).subscribe(() => {
      if (onDone) {
        onDone();
      }
    });
  }
}
