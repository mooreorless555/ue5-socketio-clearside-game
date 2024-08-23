import { GameObject } from '../game_object';
import { Room } from '../room';
import { VectorBuilder } from '../world/vector_builder';

export class Weapon extends GameObject {
  constructor(ownerId: string, room: Room) {
    const zeroVector = VectorBuilder.fromCoords(0, 0, 0).asXYZ();
    super(ownerId, zeroVector, zeroVector, room);
  }

  use() {
    console.log('Using weapon');
    this.callFunction('Use', undefined);
  }
}
