import { Entity } from './entity';
import * as BABYLON from '@babylonjs/core';
import { VectorBuilder } from './world/vector_builder';

export class Projectile<T extends Entity> extends Entity {
  private direction: BABYLON.Vector3 = BABYLON.Vector3.Zero();
  private speed: number = 0;

  constructor(
    id: string,
    private readonly mesh: BABYLON.Mesh,
    private readonly owner: T
  ) {
    super(id);

    // Dispose the mesh
    this.intervalHandler.setTimeout(() => {
      this.mesh.dispose();
    }, 100000); // Dispose after some time
  }

  setDirection(direction: BABYLON.Vector3) {
    this.direction.copyFrom(direction);
  }

  setSpeed(speed: number) {
    this.speed = speed;
  }

  getDirection(): BABYLON.Vector3 {
    return this.direction;
  }

  getSpeed(): number {
    return this.speed;
  }

  getOwner(): T {
    return this.owner;
  }

  getMesh(): BABYLON.Mesh {
    return this.mesh;
  }

  getPosition() {
    return VectorBuilder.fromBabylon(this.mesh.position).asXYZ();
  }

  update(deltaTime: number) {
    const direction = this.getDirection();
    const speed = this.getSpeed();

    // Update position
    this.mesh.position.addInPlace(direction.scale(speed * deltaTime));
  }

  dispose() {
    if (!this.mesh.isDisposed()) {
      this.mesh.dispose();
    }

    super.dispose();
  }
}
