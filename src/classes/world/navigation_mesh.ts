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
import * as workerpool from 'workerpool';
import { loadObjMesh } from './load_obj_mesh';

export class NavigationMesh {
  private readonly navigationPlugin = new BABYLON.RecastJSPlugin();
  private crowd?: BABYLON.ICrowd;
  private meshes: BABYLON.Mesh[] = [];

  private agentIdToIndex = new Map<string, number>();
  private isLoaded: boolean = false;

  constructor(private readonly scene: BABYLON.Scene) {}

  private createNavMesh(meshes: BABYLON.Mesh[]) {
    this.navigationPlugin.createNavMesh(
      meshes as BABYLON.Mesh[],
      NAV_MESH_PARAMETERS
    );
  }

  public async init(filename: string) {
    const meshes = await loadObjMesh(
      `public/navmesh/${filename}.babylon`,
      this.scene.getEngine()
    );
    // Including the first mesh causes a memory out of bounds
    // error when constructing the static mesh.
    const [, ...restMeshes] = meshes;

    this.createNavMesh(restMeshes as BABYLON.Mesh[]);
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
        size: 100,
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

export interface NavMeshAgentMoveOptions {
  acceptableDistance: number;
  onTick: (position: XYZ, velocity: XYZ, nextTarget: XYZ) => void;
  onNextTarget: (position: XYZ, nextTarget: XYZ) => void;
}

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

  async move(destination: XYZ, overrides: Partial<NavMeshAgentMoveOptions>) {
    const options = {
      acceptableDistance: 100,
      onTick: () => {},
      onNextTarget: () => {},
      ...overrides,
    };

    const isWithinAcceptableDistance =
      BABYLON.Vector3.Distance(
        this.crowd.getAgentPosition(this.agentIndex),
        VectorBuilder.fromXYZ(destination).asVector3()
      ) <= options.acceptableDistance;

    if (isWithinAcceptableDistance) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
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
          options.onNextTarget(unrealPositionVector, unrealNextTargetVector);
        });

      interval(1000 / 60)
        .pipe(takeUntil(this.complete$))
        .subscribe(() => {
          const { unrealPositionVector } = getVectors();
          const currentPosition =
            VectorBuilder.fromXYZ(unrealPositionVector).asVector3();
          const destinationVec3 =
            VectorBuilder.fromXYZ(destination).asVector3();
          if (
            BABYLON.Vector3.Distance(currentPosition, destinationVec3) <
            options.acceptableDistance
          ) {
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

          options.onTick(
            unrealPositionVector,
            unrealVelocityVector,
            unrealNextTargetVector
          );
        });

      this.complete$.subscribe(() => {
        resolve(true);
      });
    });
  }
}
