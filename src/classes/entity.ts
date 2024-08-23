import { ReplaySubject, Subject } from 'rxjs';
import { Callback, XYZ } from '../utils/types';
import { Schema } from './schema';
import { Room } from './room';
import { Socket } from 'socket.io';
import { CallFunctionOptions, SocketIntegrator } from './socket_integrator';
import { Projectile } from './projectile';
import { IntervalHandler } from './interval_handler';

export abstract class Entity extends Schema {
  name: string = 'Character';
  x: number = 0;
  y: number = 0;
  z: number = 0;
  rotX: number = 0;
  rotY: number = 0;
  rotZ: number = 0;
  disposed$ = new Subject<void>();
  socketIntegrator = new SocketIntegrator(this.id);
  intervalHandler = new IntervalHandler();

  onHitCallbacks: Callback<{ projectile: Projectile<Entity> }>[] = [];

  constructor(protected readonly id: string) {
    super();

    this.intervalHandler.setInterval(() => {}, 10);
  }

  getId() {
    return this.id;
  }

  getFullName() {
    return `${this.name} (${this.id})`;
  }

  setPosition(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  getPosition(): XYZ {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
    };
  }

  getRotation(): XYZ {
    return {
      x: this.rotX,
      y: this.rotY,
      z: this.rotZ,
    };
  }

  setRotation(x: number, y: number, z: number) {
    this.rotX = x;
    this.rotY = y;
    this.rotZ = z;
  }

  toJson() {
    return {
      id: this.id,
      name: this.name,
      x: this.x,
      y: this.y,
      z: this.z,
    };
  }

  triggerHitEvent<T extends Entity>(projectile: Projectile<T>) {
    console.log('HIT: ' + this.getId());
    this.onHitCallbacks.forEach((callback) => callback({ projectile }));
  }

  onHit(callback: Callback<{ projectile: Projectile<Entity> }>) {
    this.onHitCallbacks.push(callback);
  }

  protected setEntityVariable(
    room: Room,
    eventName: string,
    name: string,
    value: any
  ) {
    this.socketIntegrator.setVariable(room, eventName, name, value);
  }

  protected callEntityFunction<T, K extends CallFunctionOptions>(
    room: Room,
    eventName: string,
    name: string,
    arg: T,
    overrides: Partial<K> = {}
  ) {
    this.socketIntegrator.callFunction(room, eventName, name, arg, overrides);
  }

  protected async sendEntityUpdatesToSocket(socket: Socket, room: Room) {
    this.socketIntegrator.sendUpdatesToSocket(socket, room);
  }

  dispose() {
    console.log('Disposing entity: ' + this.id);
    this.disposed$.next();
  }
}
