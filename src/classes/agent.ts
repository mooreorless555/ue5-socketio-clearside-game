import assert from 'assert';
import { SocketIOType } from '../server';
import { XYZ } from '../utils/types';
import { Character } from './character';
import { NavMeshAgent } from './world/navigation_mesh';
import { IntervalHandler } from './interval_handler';
import { VectorBuilder } from './world/vector_builder';
import * as BABYLON from '@babylonjs/core';

/**
 * Represents a character on the server.
 * Provides movement and position utils.
 */
export class Agent extends Character {
  private navMeshAgent?: NavMeshAgent;
  private intervalHandler = new IntervalHandler();

  constructor(
    id: string,
    private readonly io: SocketIOType,
    private roomId: string
  ) {
    super(id);
    this.name = 'Agent';
  }

  getNavMeshAgent() {
    assert(
      this.navMeshAgent,
      `${this.getFullName()} does not have a nav mesh agent yet.`
    );
    return this.navMeshAgent;
  }

  setPositionNoEmission(x: number, y: number, z: number) {
    super.setPosition(x, y, z);
  }

  setPosition(x: number, y: number, z: number, force: boolean = false) {
    super.setPosition(x, y, z);
    const event = force ? 'playerForcePosition' : 'playerPosition';
    this.io.to(this.roomId).emit(event, {
      id: this.id,
      x,
      y,
      z,
    });

    if (this.navMeshAgent && force) {
      this.navMeshAgent.teleport({ x, y, z });
    }
  }

  getPosition(): XYZ {
    return { x: this.x, y: this.y, z: this.z };
  }

  forceSetPosition(x: number, y: number, z: number) {
    this.setPosition(x, y, z, true);
  }

  jump() {
    this.broadcast('playerJump', { id: this.id });
  }

  move(x: number, y: number) {
    this.broadcast('playerSetMove', { id: this.id, x, y });
  }

  moveTo(destination: XYZ) {
    this.broadcast('playerMoveTo', { id: this.id, ...destination });
  }

  moveForwards(value: number = 1) {
    this.move(0, value);
  }

  moveBackwards(value: number = 1) {
    this.move(0, -value);
  }

  stop() {
    this.move(0, 0);
  }

  strafeLeft(value: number = 1) {
    this.move(-value, 0);
  }

  strafeRight(value: number = 1) {
    this.move(-value, 0);
  }

  attack(attackType: number = 0) {
    this.broadcast('playerAttack', { id: this.id, attackType });
  }

  rotate(x: number, y: number, z: number) {
    this.rotX = x;
    this.rotY = y;
    this.rotZ = z;
    this.broadcast('playerRotation', { id: this.id, x, y, z });
  }

  aimAt(x: number, y: number, z: number) {
    this.broadcast('playerAimAt', { id: this.id, x, y, z });
  }

  lookAt(x: number, y: number, z: number) {
    this.broadcast('playerLookAt', { id: this.id, x, y, z });
    // this.rotate(0, 0, 300);
  }

  navigate(destination: XYZ) {
    this.getNavMeshAgent().cancel();
    this.getNavMeshAgent().move(
      destination,
      (position, velocity, nextTarget) => {
        this.setPositionNoEmission(position.x, position.y, position.z);
        this.lookAt(nextTarget.x, nextTarget.y, nextTarget.z);
        this.moveTo(position);
      },
      (position, nextTarget) => {
        // this.setPosition(position.x, position.y, position.z);
        //     // console.log('Next target: ', nextTarget);
        //   }
      }
    );
  }

  navigateWithFocus(destination: XYZ, focus: () => XYZ) {
    this.getNavMeshAgent().cancel();
    this.rotate(0, 0, 90);
    const currentRotation = this.getRotation();
    this.getNavMeshAgent().move(
      destination,
      (position, velocity, nextTarget) => {
        const currentPosition = VectorBuilder.fromXYZ(
          this.getPosition()
        ).asVector3();
        this.setPositionNoEmission(position.x, position.y, position.z);

        const newPosition = VectorBuilder.fromXYZ(position).asVector3();
        const direction = newPosition.subtract(currentPosition).normalize();

        // Create a rotation quaternion from currentRotation
        const rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
          currentRotation.y,
          currentRotation.x,
          currentRotation.z
        );

        // Transform the direction to local space
        const localDirection = BABYLON.Vector3.TransformCoordinates(
          direction,
          BABYLON.Matrix.FromQuaternionToRef(
            rotationQuaternion,
            new BABYLON.Matrix()
          ).invert()
        );

        this.rotate(currentRotation.x, currentRotation.y, currentRotation.z);
        this.aimAt(focus().x, focus().y, focus().z);
        this.move(localDirection.y, localDirection.x);
      },
      (position, nextTarget) => {
        this.setPosition(position.x, position.y, position.z);
        // console.log('Next target: ', nextTarget);
      },
      () => this.stop()
    );
  }

  navigateTo(agent: Agent) {
    this.navigate(agent.getPosition());
  }

  setNavMeshAgent(navMeshAgent: NavMeshAgent) {
    this.navMeshAgent = navMeshAgent;
  }

  dispose() {
    this.intervalHandler.clear();
  }

  private broadcast(message: string, data: any) {
    this.io.to(this.roomId).emit(message, data);
  }
}
