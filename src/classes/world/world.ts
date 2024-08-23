import * as BABYLON from '@babylonjs/core';
import { Socket } from 'socket.io';
import { Room } from '../room';
import { createMatchingBabylonBox } from './create_matching_babylon_box';
import { ObservableMap } from '../../utils/observable_map';
import XMLHttpRequest from 'xhr2';
import { readFile } from 'fs/promises';
// import 'babylonjs-loaders';
import '@babylonjs/loaders/OBJ';
import { NavigationMesh } from './navigation_mesh';
import { Entity } from '../entity';
import { GameObject } from '../game_object';
import waitUntil from 'async-wait-until';
import { IntervalHandler } from '../interval_handler';
import { waitUntilTrue, withFallback } from '../../utils/fallback';
import { VectorBuilder } from './vector_builder';
import { loadObjMesh } from './load_obj_mesh';
import { mat4, quat, vec3 } from 'gl-matrix';
import { Projectile } from '../projectile';
import { randomUUID } from 'crypto';
import { Agent } from '../agent';
import { RollPitchYaw } from '../../utils/types';

interface XYZ {
  x: number;
  y: number;
  z: number;
}
/**
 * Server side representation of the environment.
 * Runs a headless version of BABYLON engine to use for collisions
 * and nav meshes.
 */
export class World {
  private scene: BABYLON.Scene;
  private engine: BABYLON.NullEngine;
  private intervalHandler = new IntervalHandler();

  private gameObjects = new ObservableMap<string, GameObject>();
  private projectiles = new ObservableMap<string, Projectile<Agent>>();
  private navigationMesh: NavigationMesh;

  constructor(private readonly socket: Socket, private readonly room: Room) {
    this.engine = new BABYLON.NullEngine();
    this.scene = new BABYLON.Scene(this.engine);
    this.navigationMesh = new NavigationMesh(this.scene);
    global.XMLHttpRequest = XMLHttpRequest;

    // Listen for events from this socket to populate the game world.
    socket.on(
      'gameObject',
      ({ id, extent, origin, rotation, scripts, ignoreHitEvents }) => {
        // const mesh = createMatchingBabylonBox(
        //   this.scene,
        //   id,
        //   getBabylonVector(extent),
        //   getBabylonVector(origin)
        // );
        this.room.log('Game object added: ', id, origin);
        const gameObject = new GameObject(
          id,
          extent,
          origin,
          room,
          scripts,
          ignoreHitEvents
        );
        gameObject.setRotation(rotation.x, rotation.y, rotation.z);
        this.gameObjects.set(id, gameObject);
      }
    );

    // Initialize navigation mesh only if an agent has been added.
    this.room.agents.onAdd((agent) => {
      if (this.room.agents.size === 1) {
        this.initNavigationMesh();
      }
    });

    this.gameObjects.onRemove((key, gameObject) => {
      // Remove the object for everybody in the room.
      // this.room.actions.forEverybody().gameObject.dispose();
      gameObject.dispose();
    });

    this.projectiles.onAdd((key, p) => {});

    this.engine.runRenderLoop(() => {
      if (this.scene.isDisposed) return;
      this.updateProjectiles();
      this.scene.render();
    });

    const camera = new BABYLON.ArcRotateCamera(
      'camera',
      Math.PI / 2,
      Math.PI / 2,
      2,
      new BABYLON.Vector3(0, 0, 0),
      this.scene
    );

    // Start render loop.
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  private async initNavigationMesh() {
    await this.navigationMesh.init('thirdpersonmap');
  }

  public hasNavigationMeshLoaded(): boolean {
    return this.navigationMesh.hasLoaded();
  }

  public async getPlayerStarts(): Promise<GameObject[]> {
    await this.intervalHandler.waitUntil(
      () => this.getGameObjects('PlayerStart').length > 0
    );
    return this.getGameObjects('PlayerStart');
  }

  public getNavigationMesh(): NavigationMesh {
    return this.navigationMesh;
  }

  public async getGameObjectById(id: string): Promise<GameObject | undefined> {
    const success = await waitUntil(() => this.gameObjects.has(id));
    if (success) {
      return this.gameObjects.get(id);
    }

    return undefined;
  }

  public getGameObjects(substring: string): GameObject[] {
    const gameObjects = Array.from(this.gameObjects.values());
    return gameObjects.filter((gameObject) =>
      gameObject.getId().includes(substring)
    );
  }

  public searchForGameObject(idSubstring: string): GameObject | undefined {
    const gameObjects = Array.from(this.gameObjects.values());
    const filteredGameObjects = gameObjects.filter((gameObject) =>
      gameObject.getId().includes(idSubstring)
    );
    if (filteredGameObjects.length === 0) {
      return undefined;
    }
    return filteredGameObjects[0];
  }

  public getAllGameObjects(): GameObject[] {
    return Array.from(this.gameObjects.values());
  }

  public getScene(): BABYLON.Scene {
    return this.scene;
  }

  public render(): void {
    this.scene.render();
  }

  public dispose(): void {
    this.intervalHandler.clear();
    this.gameObjects.clear();
    this.scene.dispose();
    this.engine.stopRenderLoop();
    this.engine.dispose();
  }

  // createProjectile(position: XYZ, rotation: XYZ, speed: number): void {
  //   const projectile = BABYLON.MeshBuilder.CreateSphere(
  //     'projectile',
  //     { diameter: 0.5 },
  //     this.scene
  //   );
  //   console.log('ROTATION:', rotation);
  //   projectile.position = VectorBuilder.fromXYZ(position).asVector3();

  //   // Create a rotation quaternion from Euler angles
  //   const rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(
  //     BABYLON.Tools.ToRadians(rotation.x),
  //     BABYLON.Tools.ToRadians(rotation.y),
  //     BABYLON.Tools.ToRadians(rotation.z)
  //   );
  //   projectile.rotationQuaternion = rotationQuaternion;

  //   // Calculate direction vector based on rotation
  //   const direction =
  //     BABYLON.Vector3.Forward().applyRotationQuaternion(rotationQuaternion);

  //   console.log('DIRECTION: ', direction);

  //   // Apply physics impulse
  //   projectile.physicsImpostor = new BABYLON.PhysicsImpostor(
  //     projectile,
  //     BABYLON.PhysicsImpostor.SphereImpostor,
  //     { mass: 1, restitution: 0.9 },
  //     this.scene
  //   );
  //   projectile.physicsImpostor.applyImpulse(
  //     direction.scale(speed),
  //     projectile.getAbsolutePosition()
  //   );

  //   // Store direction and speed on the mesh for later use
  //   (projectile as any).direction = direction;
  //   (projectile as any).speed = speed;

  //   this.projectiles.set(projectile.name + Date.now(), projectile);
  // }

  createProjectile<T extends Agent>(
    position: XYZ,
    rotation: RollPitchYaw,
    speed: number,
    owner: T
  ): void {
    // Create a basic sphere as the projectile
    const projectileMesh = BABYLON.MeshBuilder.CreateSphere(
      'projectile',
      { diameter: 1 },
      this.scene
    );

    // Set the projectile's position
    projectileMesh.position = VectorBuilder.fromXYZ(position).asVector3();
    const { roll, pitch, yaw } = rotation;

    // Convert rotation from degrees to radians
    const pitchRad = pitch * 0.0174;
    const yawRad = yaw * 0.0174;

    const bDirection = VectorBuilder.fromCoords(
      Math.cos(yawRad) * Math.cos(pitchRad),
      Math.sin(yawRad) * Math.cos(pitchRad),
      Math.sin(pitchRad)
    )
      .asVector3()
      .normalize();

    const projectile = new Projectile<Agent>(
      'Projectile_' + randomUUID(),
      projectileMesh,
      owner
    );
    projectile.setDirection(bDirection);
    projectile.setSpeed(speed);
    this.projectiles.set(projectile.getId(), projectile);
  }

  private updateProjectiles(): void {
    const deltaTime = this.scene.getEngine().getDeltaTime() / 1000; // Convert to seconds
    this.projectiles.forEach((projectile) => {
      // Update the projectile's position based on its speed and direction.
      projectile.update(deltaTime);

      // Check for collisions with agents and game objects.
      const entities = [
        ...this.room.getPlayersAndAgents(),
        ...this.gameObjects.values(),
      ];
      entities
        .filter((entity) => entity.getId() !== projectile.getOwner().getId())
        .filter((entity) => !entity.getId().includes('PlayerStart'))
        .forEach((entity) => {
          const entityPosition = VectorBuilder.fromXYZ(
            entity.getPosition()
          ).asVector3();
          const projectilePosition = VectorBuilder.fromXYZ(
            projectile.getPosition()
          ).asVector3();

          if (entity instanceof GameObject) {
            if (entity.isWithinBounds(projectilePosition)) {
              entity.triggerHitEvent(projectile);
              this.projectiles.delete(projectile.getId());
              return;
            }
          } else if (
            BABYLON.Vector3.Distance(entityPosition, projectilePosition) < 100
          ) {
            entity.triggerHitEvent(projectile);
            this.projectiles.delete(projectile.getId());
          }
        });
    });
  }
}
