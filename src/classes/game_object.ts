import { Socket } from 'socket.io';
import { XYZ } from '../utils/types';
import { Entity } from './entity';
import { Room } from './room';
import assert from 'assert';
import { CallFunctionOptions } from './socket_integrator';
import { ScriptManager } from './script_manager';
import { ServerScriptArgs } from './scripts/core';

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

  private readonly scriptManager = new ScriptManager();

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

  isWithinBounds(position: XYZ, errorMargin: number = 0) {
    return (
      position.x >= this.x - this.extent.x &&
      position.x <= this.x + this.extent.x &&
      position.y >= this.y - this.extent.y &&
      position.y <= this.y + this.extent.y &&
      position.z >= this.z - this.extent.z &&
      position.z <= this.z + this.extent.z
    );
  }

  getType(): string {
    return this.type;
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
