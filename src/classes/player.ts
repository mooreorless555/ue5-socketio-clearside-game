import { Socket } from 'socket.io';
import { SocketIOType } from '../server';
import { Character } from './character';
import { Agent } from './agent';

export class Player extends Agent {
  iaMoveActionValueX: number = 0;
  iaMoveActionValueY: number = 0;
  iaLookActionValueX: number = 0;
  iaLookActionValueY: number = 0;

  constructor(
    readonly socket: Socket,
    private readonly io: SocketIOType,
    private roomId: string
  ) {
    super(socket.id, io, roomId);
    this.name = 'Player';

    // Handle look events
    socket.on('playerLook', ({ x, y }) => {
      this.iaLookActionValueX = x;
      this.iaLookActionValueY = y;
      // Broadcast the new inputs to others.
      socket.broadcast.emit('playerLook', { id: this.id, x, y });
    });
    // Handle move events
    socket.on('playerMove', ({ x, y }) => {
      this.iaMoveActionValueX = x;
      this.iaMoveActionValueY = y;
      // Broadcast the new inputs to others.
      socket.broadcast.emit('playerMove', { id: this.id, x, y });
    });
    // Handle rotation events
    socket.on('playerRotation', ({ x, y, z }) => {
      this.rotX = x;
      this.rotY = y;
      this.rotZ = z;
      // Broadcast the new inputs to others.
      socket.broadcast.emit('playerRotation', { id: this.id, x, y, z });
    });
    // Handle position events
    socket.on('playerPosition', ({ x, y, z }) => {
      this.x = x;
      this.y = y;
      this.z = z;
      socket.broadcast.emit('playerPosition', { id: this.id, x, y, z });
    });
    // Handle jump events
    socket.on('playerJump', () => {
      socket.broadcast.emit('playerJump', { id: this.id });
    });
    // Handle aim events (left hand = lh, right hand = rh, head = h)
    socket.on(
      'playerAim',
      ({ lhrx, lhry, lhrz, rhrx, rhry, rhrz, hrx, hry, hrz }) => {
        const result = {
          id: this.socket.id,
          lhrx,
          lhry,
          lhrz,
          rhrx,
          rhry,
          rhrz,
          hrx,
          hry,
          hrz,
        };
        socket.broadcast.emit('playerAim', result);
      }
    );
    socket.on('playerShootLeft', () => {
      socket.broadcast.emit('playerAttack', { id: this.id, attackType: 0 });
    });
    socket.on('playerShootRight', () => {
      socket.broadcast.emit('playerAttack', { id: this.id, attackType: 1 });
    });
  }

  async joinRoom(roomId: string) {
    await this.socket.join(roomId);
    this.roomId = roomId;
  }

  toJson() {
    return {
      id: this.socket.id,
      name: this.name,
      x: this.x,
      y: this.y,
      z: this.z,
    };
  }
}
