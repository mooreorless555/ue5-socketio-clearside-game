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

interface XYZ {
  x: number;
  y: number;
  z: number;
}
interface GameObject {
  extent: XYZ;
  origin: XYZ;
  id: string;
  mesh: BABYLON.Mesh;
}

/**
 * Server side representation of the environment.
 * Runs a headless version of BABYLON engine to use for collisions
 * and nav meshes.
 */
export class World {
  private scene: BABYLON.Scene;
  private engine: BABYLON.NullEngine;

  private gameObjects = new ObservableMap<string, GameObject>();
  private navigationMesh: NavigationMesh;

  constructor(private readonly socket: Socket, private readonly room: Room) {
    this.engine = new BABYLON.NullEngine();
    this.scene = new BABYLON.Scene(this.engine);
    this.navigationMesh = new NavigationMesh(this.scene);
    global.XMLHttpRequest = XMLHttpRequest;

    // Listen for events from this socket to populate the game world.
    socket.on('gameObject', ({ id, extent, origin }) => {
      const mesh = createMatchingBabylonBox(
        this.scene,
        id,
        getBabylonVector(extent),
        getBabylonVector(origin)
      );
      this.gameObjects.set(id, { extent, origin, id, mesh });
    });

    this.init();
  }

  private async init() {
    await this.navigationMesh.init('thirdpersonmap.obj');

    const camera = new BABYLON.ArcRotateCamera(
      'camera',
      Math.PI / 2,
      Math.PI / 2,
      2,
      new BABYLON.Vector3(0, 0, 0),
      this.scene
    );

    // Register a render loop to repeatedly render the scene
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  public hasNavigationMeshLoaded(): boolean {
    return this.navigationMesh.hasLoaded();
  }

  public getNavigationMesh(): NavigationMesh {
    return this.navigationMesh;
  }

  public getScene(): BABYLON.Scene {
    return this.scene;
  }

  public render(): void {
    this.scene.render();
  }
}

function getBabylonVector(v: XYZ) {
  return new BABYLON.Vector3(v.y, v.z, v.x);
}
