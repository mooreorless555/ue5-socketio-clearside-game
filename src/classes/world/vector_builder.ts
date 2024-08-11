import * as BABYLON from '@babylonjs/core';
import { getIntersectedVector } from './get_intersected_vector';
import { XYZ } from '../../utils/types';

export class VectorBuilder {
  constructor(public x: number, public y: number, public z: number) {}

  static fromCoords(x: number, y: number, z: number): VectorBuilder {
    return new VectorBuilder(x, y, z);
  }

  static fromXYZ(xyz: XYZ): VectorBuilder {
    return new VectorBuilder(xyz.x, xyz.y, xyz.z);
  }

  static fromBabylon(vector3: BABYLON.Vector3): VectorBuilder {
    return new VectorBuilder(vector3.x, vector3.y, vector3.z);
  }

  toUnreal(): VectorBuilder {
    const newVector = getUnrealVector(this.x, this.y, this.z);
    this.x = newVector.x;
    this.y = newVector.y;
    this.z = newVector.z;
    return this;
  }

  toBabylon(): VectorBuilder {
    const newVector = getBabylonVector(this.x, this.y, this.z);
    this.x = newVector.x;
    this.y = newVector.y;
    this.z = newVector.z;
    return this;
  }

  toString(): string {
    return JSON.stringify(this.asXYZ());
  }

  toIntersectWithMesh(meshes: BABYLON.Mesh[]) {
    const thisVector = this.asVector3();
    const intersectedVector = getIntersectedVector(meshes, thisVector);
    this.x = intersectedVector.x;
    this.y = intersectedVector.y;
    this.z = intersectedVector.z;
    return this;
  }

  asVector3(): BABYLON.Vector3 {
    return new BABYLON.Vector3(this.x, this.y, this.z);
  }

  asXYZ(): XYZ {
    return { x: this.x, y: this.y, z: this.z };
  }
}

function getBabylonVector(x: number, y: number, z: number) {
  return new BABYLON.Vector3(-x, z, y);
}

function getUnrealVector(x: number, y: number, z: number): XYZ {
  return { x: -x, y: z, z: y };
}
