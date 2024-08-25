import { Socket } from 'socket.io';
import { XYZ } from '../utils/types';
import { Entity } from './entity';
import { Room } from './room';
import assert from 'assert';
import { CallFunctionOptions } from './socket_integrator';
import { ScriptManager } from './script_manager';
import { ServerScriptArgs } from './scripts/core';
import { Projectile } from './projectile';

export interface GameObjectCallFunctionOptions extends CallFunctionOptions {
  callOnOwner: boolean;
}

export type ScriptArgs = Map<string, any>;
interface GameObjectScriptNameAndArgs {
  name: string;
  args: ScriptArgs | undefined;
}

export class GameObject extends Entity {
  static search<T extends GameObject>(idSubstring: string, room: Room): T {
    const gameObject = room.getWorld().searchForGameObject(idSubstring);
    assert(
      gameObject,
      'Could not find game object with substring: ' + idSubstring
    );
    return gameObject as T;
  }
  static async fromId(id: string, room: Room): Promise<GameObject> {
    const gameObject = await room.getWorld().getGameObjectById(id);
    assert(gameObject, `GameObject.fromId failed for: ${id}`);
    return gameObject;
  }

  private readonly scriptManager = new ScriptManager('ScriptManager');

  extent: XYZ = { x: 0, y: 0, z: 0 };
  constructor(
    protected readonly id: string,
    extent: XYZ,
    origin: XYZ,
    protected readonly room: Room,
    protected readonly scripts: GameObjectScriptNameAndArgs[] = [],
    protected readonly ignoreHitEvents: boolean = false
  ) {
    super(id);
    this.extent = extent;
    this.setPosition(origin.x, origin.y, origin.z);

    console.log('Scripts', scripts);
    for (const script of scripts) {
      const argsMap = new Map(Object.entries(script.args ?? {}));
      this.addScript(`entities/${script.name}`, argsMap);
    }
  }

  isWithinBounds(position: XYZ) {
    const rotation = this.getRotation();
    // Convert the position to the local space of the bounding box
    const localPosition = this.rotatePointAroundOrigin(
      {
        x: position.x - this.x,
        y: position.y - this.y,
        z: position.z - this.z,
      },
      -rotation.x,
      -rotation.y,
      -rotation.z
    );

    // Check if the local position is within the bounding box
    return (
      Math.abs(localPosition.x) <= this.extent.x &&
      Math.abs(localPosition.y) <= this.extent.y &&
      Math.abs(localPosition.z) <= this.extent.z
    );
  }

  // Helper function to rotate a point around the origin
  rotatePointAroundOrigin(
    point: XYZ,
    rotationX: number,
    rotationY: number,
    rotationZ: number
  ): XYZ {
    const sinX = Math.sin(rotationX);
    const cosX = Math.cos(rotationX);
    const sinY = Math.sin(rotationY);
    const cosY = Math.cos(rotationY);
    const sinZ = Math.sin(rotationZ);
    const cosZ = Math.cos(rotationZ);

    const x =
      point.x * cosY * cosZ +
      point.y * (sinX * sinY * cosZ - cosX * sinZ) +
      point.z * (cosX * sinY * cosZ + sinX * sinZ);
    const y =
      point.x * cosY * sinZ +
      point.y * (sinX * sinY * sinZ + cosX * cosZ) +
      point.z * (cosX * sinY * sinZ - sinX * cosZ);
    const z = point.x * -sinY + point.y * sinX * cosY + point.z * cosX * cosY;

    return { x, y, z };
  }

  getRoom() {
    return this.room;
  }

  lerpPosition(position: XYZ, alpha: number = 0.1) {
    this.setPosition(position.x, position.y, position.z);
    this.callSetPosition(position, alpha);
  }

  lerpPositionTo(entity: Entity, alpha: number = 0.1) {
    this.setPosition(entity.x, entity.y, entity.z);
    this.callSetPosition(entity.getPosition(), alpha);
  }

  playSound(config: { soundName: string; minPitch: number; maxPitch: number }) {
    this.callFunction('PlaySound', JSON.stringify(config));
  }

  triggerHitEvent<T extends Entity>(projectile: Projectile<T>): void {
    if (this.ignoreHitEvents) return;
    super.triggerHitEvent(projectile);
  }

  private callSetPosition(position: XYZ, alpha: number) {
    this.callFunction(
      'DoSetPosition',
      JSON.stringify({
        alpha,
        ...position,
      })
    );
  }

  setVariable(name: string, value: any) {
    super.setEntityVariable(this.room, 'gameObjectSetVariable', name, value);
  }

  callFunction<T>(
    name: string,
    arg: T,
    overrides: Partial<GameObjectCallFunctionOptions> = {}
  ) {
    super.callEntityFunction(
      this.room,
      'gameObjectCallFunction',
      name,
      arg,
      overrides
    );
  }

  async addScript(
    scriptPath: string,
    scriptArgs: Map<string, any> = new Map()
  ) {
    const config: ServerScriptArgs = {
      gameObject: this,
      args: scriptArgs,
    };
    const script = await this.scriptManager.runScript(
      `./scripts/${scriptPath}`,
      config
    );
    return script;
  }

  getScript(path: string) {
    return this.scriptManager.get(path);
  }

  async sendUpdatesToSocket(socket: Socket) {
    super.sendEntityUpdatesToSocket(socket, this.room);
  }

  dispose() {
    this.callFunction('Destroy', '', { save: true });
    this.scriptManager.dispose();
    super.dispose();
  }
}
