import { readFile } from 'fs/promises';
import * as BABYLON from '@babylonjs/core';
import { executeInThread, ThreadModules } from 'funthreads';

export async function loadObjMesh_Task(filename: string): Promise<any> {
  const { readFile } = require('fs/promises');
  const BABYLON = require('@babylonjs/core');
  require('@babylonjs/loaders');

  return new Promise(async (resolve, reject) => {
    try {
      const file = await readFile(filename, 'utf8');
      const objString = `data: ${file}`;
      const meshes: any[] = []; // Array to hold serialized meshes

      const engine = new BABYLON.NullEngine();
      const scene = new BABYLON.Scene(engine);

      BABYLON.SceneLoader.ImportMesh(
        '',
        '',
        objString,
        scene, // No scene in the worker thread
        (loadedMeshes) => {
          loadedMeshes.forEach((mesh) => {
            meshes.push(mesh.serialize());
          });

          // console.log({ meshes }); // Logging serialized meshes
          resolve(meshes); // Resolve with the serialized meshes
        },
        undefined,
        (err) => {
          console.error('Mesh loading error:', err);
          reject(err); // Reject the promise in case of an error
        },
        '.obj'
      );
    } catch (err) {
      console.error('Error reading file:', err);
      reject(err); // Reject the promise in case of an error
    }
  });
}

export async function loadObjMesh(
  filename: string,
  engine: BABYLON.AbstractEngine
): Promise<BABYLON.AbstractMesh[]> {
  const file = await readFile(filename, 'utf8');
  const objString = `data: ${file}`;
  const scene = await BABYLON.SceneLoader.LoadAsync(objString, engine);
  return scene.meshes;
}
