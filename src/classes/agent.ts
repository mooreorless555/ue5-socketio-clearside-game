import assert from 'assert';
import { SocketIOType } from '../server';
import { XYZ } from '../utils/types';
import { Entity } from './entity';
import { NavMeshAgent, NavMeshAgentMoveOptions } from './world/navigation_mesh';
import { IntervalHandler } from './interval_handler';
import { VectorBuilder } from './world/vector_builder';
import * as BABYLON from '@babylonjs/core';
import { Room } from './room';
import { Socket } from 'socket.io';
import { effect, Signal, signal } from '@preact/signals';
import { CallFunctionOptions } from './socket_integrator';
import { HealthComponent } from './components/health_component';

export interface Weapon {
  ammo: Signal<number>;
  maxAmmo: Signal<number>;
}

/**
 * Represents a character on the server.
 * Provides movement and position utils.
 */
export class Agent extends Entity {
  private navMeshAgent?: NavMeshAgent;
  private room: Room;

  // Health information
  private readonly healthComponent = new HealthComponent(this);

  // Aiming information
  protected leftHandRot = VectorBuilder.zero().asRollPitchYaw();
  protected rightHandRot = VectorBuilder.zero().asRollPitchYaw();

  // Glove information
  private leftGlove: Weapon = {
    ammo: signal(30),
    maxAmmo: signal(30),
  };
  private rightGlove: Weapon = {
    ammo: signal(30),
    maxAmmo: signal(30),
  };

  constructor(id: string, room: Room) {
    super(id);
    this.room = room;
    this.name = 'Agent';

    // Handle health changes
    this.healthComponent.onHealthChanged((health) => {
      room.actions
        .forEverybody()
        .printToConsole(`${this.id} was damaged. New health: ${health}`);
    });

    // Register ammo events for agent.
    effect(() => {
      this.callFunction('SetLeftGloveAmmo', this.leftGlove.ammo.value);
      this.callFunction('SetRightGloveAmmo', this.rightGlove.ammo.value);
    });
    // Register projectile hit events
    this.registerOnProjectileHitEvent();
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

  setPositionTo(entity: Entity) {
    this.setPosition(entity.x, entity.y, entity.z, true);
  }

  setPosition(x: number, y: number, z: number, force: boolean = false) {
    super.setPosition(x, y, z);
    const event = force ? 'playerForcePosition' : 'playerPosition';
    this.room.emit(event, {
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
    this.getNavMeshAgent().cancel();
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

  getGameObject() {
    return this.room.getWorld().getGameObjectById(this.id);
  }

  async shootLeftGlove() {
    this.callFunction('ShootLeftGlove', undefined);
    if (this.leftGlove.ammo.value > 0) {
      this.room
        .getWorld()
        .createProjectile(this.getPosition(), this.leftHandRot, 3000, this);
      this.leftGlove.ammo.value -= 1;
    }
  }

  async shootRightGlove() {
    this.callFunction('ShootRightGlove', undefined);
    if (this.rightGlove.ammo.value > 0) {
      this.room
        .getWorld()
        .createProjectile(this.getPosition(), this.rightHandRot, 3000, this);
      this.rightGlove.ammo.value -= 1;
    }
  }

  rotate(x: number, y: number, z: number) {
    this.rotX = x;
    this.rotY = y;
    this.rotZ = z;
    this.leftHandRot.roll = x;
    this.leftHandRot.pitch = y;
    this.leftHandRot.yaw = z;
    this.rightHandRot.roll = x;
    this.rightHandRot.pitch = y;
    this.rightHandRot.yaw = z;
    this.broadcast('playerRotation', { id: this.id, x, y, z });
  }

  aimAt(entity: Entity) {
    const { x, y, z } = entity.getPosition();
    this.aimAtLocation(x, y, z);
  }

  aimAtLocation(x: number, y: number, z: number) {
    const newLocation = VectorBuilder.fromCoords(x, y, z).asXYZ();
    const agentPosition = this.getPosition();
    // Check if newLocation is behind the agent
    const lookAtRotation = VectorBuilder.fromXYZ(agentPosition)
      .toLookAtRotation(newLocation)
      .asRollPitchYaw();
    if (Math.abs(lookAtRotation.yaw) > 50) {
      this.rotateToLocation(x, y, z);
    }
    // Get look at rotation
    const latRot = (xyz: XYZ) =>
      VectorBuilder.fromXYZ(agentPosition)
        .toLookAtRotation(xyz)
        .asRollPitchYaw();
    this.leftHandRot = latRot(newLocation);
    this.rightHandRot = latRot(newLocation);

    this.broadcast('playerAimAt', { id: this.id, x, y, z });
  }

  lookAtLocation(x: number, y: number, z: number) {
    this.broadcast('playerLookAt', { id: this.id, x, y, z });
  }

  lookAt(agent: Agent) {
    const { x, y, z } = agent.getPosition();
    this.lookAtLocation(x, y, z);
  }

  rotateTo(entity: Entity) {
    const { x, y, z } = entity.getPosition();
    this.rotateToLocation(x, y, z);
  }

  rotateToLocation(x: number, y: number, z: number) {
    const target = VectorBuilder.fromCoords(x, y, z).asXYZ();
    const source = this.getPosition();
    const newRotation = VectorBuilder.fromXYZ(source)
      .toLookAtRotation(target)
      .asXYZ();

    // Apply the rotation using the rotate function
    // newRotation.x is pitch, newRotation.y is yaw, newRotation.z is roll
    this.rotate(0, 0, newRotation.z);
  }

  async navigate(
    destination: XYZ,
    overrides: Partial<NavMeshAgentMoveOptions> = {}
  ) {
    this.getNavMeshAgent().cancel();
    this.getNavMeshAgent().teleport(this.getPosition());
    return this.getNavMeshAgent().move(destination, {
      onTick: (position, velocity, nextTarget) => {
        this.setPositionNoEmission(position.x, position.y, position.z);
        this.lookAtLocation(nextTarget.x, nextTarget.y, nextTarget.z);
        this.moveTo(position);
      },
      ...overrides,
    });
  }

  navigateWithFocus(destination: XYZ, focus: () => XYZ) {
    this.getNavMeshAgent().cancel();
    const currentRotation = this.getRotation();
    this.getNavMeshAgent().move(destination, {
      onTick: (position, velocity, nextTarget) => {
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
        this.aimAtLocation(focus().x, focus().y, focus().z);
        this.move(localDirection.y, localDirection.x);
      },
    });
  }

  navigateTo(entity: Entity, overrides: Partial<NavMeshAgentMoveOptions> = {}) {
    this.navigate(entity.getPosition(), overrides);
  }

  async patrolTo(entity: Entity) {
    const initialPosition = this.getPosition();
    await this.navigateTo(entity);
    await this.navigate(initialPosition);
  }

  setNavMeshAgent(navMeshAgent: NavMeshAgent) {
    this.navMeshAgent = navMeshAgent;
  }

  setLeftGloveAmmo(newAmmo: number) {
    this.leftGlove.ammo.value = newAmmo;
  }

  setRightGloveAmmo(newAmmo: number) {
    this.rightGlove.ammo.value = newAmmo;
  }

  launch(launchVelocity: XYZ) {
    this.callFunction('DoLaunchCharacter', JSON.stringify(launchVelocity));
  }

  registerOnProjectileHitEvent() {
    this.onHit(({ projectile }) => {
      this.healthComponent.decreaseHealth(10);
    });
  }

  setVariable(name: string, value: any) {
    super.setEntityVariable(this.room, 'playerSetVariable', name, value);
  }

  callFunction<T>(
    name: string,
    arg: T,
    overrides: Partial<CallFunctionOptions> = {}
  ) {
    super.callEntityFunction(
      this.room,
      'playerCallFunction',
      name,
      arg + '',
      overrides
    );
  }

  async sendUpdatesToSocket(socket: Socket) {
    super.sendEntityUpdatesToSocket(socket, this.room);
  }

  dispose() {
    this.navMeshAgent?.cancel();
    this.intervalHandler.clear();
    this.disposed$.next();
  }

  private broadcast(message: string, data: any) {
    this.room.emit(message, data);
  }
}
