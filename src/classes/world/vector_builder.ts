import * as BABYLON from '@babylonjs/core';
import { getIntersectedVector } from './get_intersected_vector';
import { XYZ } from '../../utils/types';
import { Vector } from 'babylonjs';
import { Entity } from '../entity';
import { vec3 } from 'gl-matrix';

export class VectorBuilder {
  constructor(public x: number, public y: number, public z: number) {}

  static fromCoords(x: number, y: number, z: number): VectorBuilder {
    return new VectorBuilder(x, y, z);
  }

  static fromXYZ(xyz: XYZ): VectorBuilder {
    return new VectorBuilder(xyz.x, xyz.y, xyz.z);
  }

  static fromEntity(entity: Entity): VectorBuilder {
    return new VectorBuilder(entity.x, entity.y, entity.z);
  }

  static fromBabylon(vector3: BABYLON.Vector3): VectorBuilder {
    return new VectorBuilder(vector3.x, vector3.y, vector3.z);
  }

  static fromVec3(vector: vec3): VectorBuilder {
    return new VectorBuilder(vector[0], vector[1], vector[2]);
  }

  static fromUnrealString(unrealString: string): VectorBuilder {
    if (!unrealString) {
      return VectorBuilder.zero();
    }
    const [x, y, z] = unrealString.split(' ');
    return new VectorBuilder(
      parseFloat(x.split('=')[1]),
      parseFloat(y.split('=')[1]),
      parseFloat(z.split('=')[1])
    );
  }

  static zero(): VectorBuilder {
    return new VectorBuilder(0, 0, 0);
  }

  add(vector: VectorBuilder): VectorBuilder {
    this.x += vector.x;
    this.y += vector.y;
    this.z += vector.z;
    return this;
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

  toRandomPointWithinRadius(radius: number = 100): VectorBuilder {
    // Generate random angles for spherical coordinates
    const theta = Math.random() * 2 * Math.PI; // Angle around the z-axis
    const phi = Math.acos(2 * Math.random() - 1); // Angle from the z-axis

    // Convert spherical coordinates to Cartesian coordinates
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    // Add the random offset to the original vector
    this.x += x;
    this.y += y;
    this.z += z;
    return this;
  }

  // Function to get a point along the line between the start and target vectors
  toPointAlongLine(t: number): VectorBuilder {
    const x = this.x + t;
    const y = this.y + t;
    const z = this.z + t;

    return new VectorBuilder(x, y, z);
  }

  toLookAtRotation(target: XYZ): VectorBuilder {
    return VectorBuilder.fromXYZ(findLookAtRotation(this.asXYZ(), target));
  }

  asVector3(): BABYLON.Vector3 {
    return new BABYLON.Vector3(this.x, this.y, this.z);
  }

  asXYZ(): XYZ {
    return { x: this.x, y: this.y, z: this.z };
  }

  asRollPitchYaw(): { roll: number; pitch: number; yaw: number } {
    return { roll: this.x, pitch: this.y, yaw: this.z };
  }
}

function getBabylonVector(x: number, y: number, z: number) {
  return new BABYLON.Vector3(-x, z, y);
}

function getUnrealVector(x: number, y: number, z: number): XYZ {
  return { x: -x, y: z, z: y };
}

function findLookAtRotation(
  source: XYZ,
  target: XYZ
): { x: number; y: number; z: number } {
  // Calculate the direction vector
  const directionX = target.x - source.x;
  const directionY = target.y - source.y;
  const directionZ = target.z - source.z;

  // Calculate the yaw (rotation around the Z-axis)
  const yaw = Math.atan2(directionY, directionX);

  // Calculate the pitch (rotation around the Y-axis)
  const pitch = Math.atan2(
    directionZ,
    Math.sqrt(directionX ** 2 + directionY ** 2)
  );

  // Roll is typically zero unless you want to bank or tilt the object
  const roll = 0;

  // Convert from radians to degrees
  const x = roll * (180 / Math.PI); // Keeping roll as zero
  const y = pitch * (180 / Math.PI);
  const z = yaw * (180 / Math.PI);

  return { x, y, z };
}
