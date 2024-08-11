import { XYZ } from '../utils/types';
import { Schema } from './schema';

export abstract class Character extends Schema {
  name: string = 'Character';
  x: number = 0;
  y: number = 0;
  z: number = 0;
  rotX: number = 0;
  rotY: number = 0;
  rotZ: number = 0;

  constructor(protected readonly id: string) {
    super();
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

  getRotation(): XYZ {
    return {
      x: this.rotX,
      y: this.rotY,
      z: this.rotZ,
    };
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

  abstract dispose(): void;
}
