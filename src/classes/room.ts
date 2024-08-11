import { Socket } from 'socket.io';
import { SocketIOType } from '../server';
import { ObservableMap } from '../utils/observable_map';
import { Player } from './player';
import { World } from './world/world';
import { RoomActions } from './room_actions';
import { Agent } from './agent';
import assert from 'assert';
import { IntervalHandler } from './interval_handler';
import { wait } from '../utils/wait';
import { VectorBuilder } from './world/vector_builder';
import * as BABYLON from '@babylonjs/core';

type EventHandler = (data: any, socket: Socket) => void;

export class Room {
  private eventHandlers = new Map<string, EventHandler[]>();
  private world?: World;
  private actions: RoomActions = new RoomActions(this);
  private intervalHandler = new IntervalHandler();

  private host: Player;

  readonly agents = new ObservableMap<string, Agent>();
  readonly players = new ObservableMap<string, Player>();

  constructor(readonly roomId: string, readonly io: SocketIOType) {
    this.agents.onAdd(async (key, addedAgent) => {
      // Emit agentAdded for all players
      this.players.forEach((player) => {
        player.socket.emit('playerAdded', {
          isAi: true,
          ...addedAgent.toJson(),
        });
      });
    });
    this.agents.onRemove((key, removedAgent) => {
      // Emit agentRemoved for all players
      this.log('Removing agent: ', removedAgent.getFullName());
      removedAgent.dispose();
      this.players.forEach((player) => {
        player.socket.emit('playerRemoved', removedAgent.toJson());
      });
    });

    this.players.onAdd((key, addedPlayer) => {
      // Emit playerAdded for the newly added player.
      this.emitToEachPlayer('playerAdded', (player) => {
        return {
          ...addedPlayer.toJson(),
          isMe: player.socket.id === addedPlayer.socket.id,
        };
      });

      // Move the new player
      addedPlayer.setPosition(
        600 + Math.random() * 400,
        600 + Math.random() * 400,
        300
      );

      // Retroactively add the players already in the room for the added player.
      this.players.forEach((player) => {
        if (player.socket.id === addedPlayer.socket.id) return;
        addedPlayer.socket.emit('playerAdded', {
          ...player.toJson(),
          isMe: false,
        });
      });

      // Add AI agents currently in the room.
      this.agents.forEach((agent) => {
        addedPlayer.socket.emit('playerAdded', agent.toJson());
      });

      // Set up a disconnect handler for the new player.
      addedPlayer.socket.on('disconnect', () => {
        this.players.delete(addedPlayer.socket.id);
      });

      // Handle server authority comparison events
      addedPlayer.socket.on('compare', ({ id, x, y, z }, callback) => {
        console.log('Compare event: ', id, x, y, z);
        const clientPosition = VectorBuilder.fromCoords(x, y, z).asVector3();
        const agent = this.agents.get(id);
        if (agent?.getPosition()) {
          const agentPosition = VectorBuilder.fromXYZ(
            agent.getPosition()
          ).asVector3();
          const distance = BABYLON.Vector3.Distance(
            clientPosition,
            agentPosition
          );
          if (distance > 400) {
            console.log('Distance is too far', distance, { agentPosition });
            callback({ ...agentPosition });
          }
        }
      });

      // If it's the first player added, initialize the world.
      if (this.players.size === 1) {
        this.host = addedPlayer;
        this.initializeAsHost(addedPlayer);
        this.initializeGameWorld(addedPlayer.socket);
        this.log('Looking...');
        this.intervalHandler.setTimeout(async () => {
          //   addedPlayer.aimAt(30, 0, 0);
          const a = await this.actions.spawnEnemy();
          this.intervalHandler.setTimeout(() => {
            a.navigateWithFocus(
              {
                x: 937.1508678935422,
                y: 1856.820725791315,
                z: 673.4644661682231,
              },
              () => addedPlayer.getPosition()
            );

            this.intervalHandler.setInterval(() => {
              a.attack();
            }, 800);
            // this.intervalHandler.setInterval(() => {
            //   a.navigate(addedPlayer.getPosition());
            // }, 500);
            this.log('MOVING!!');
          });
        });

        //   a.moveForwards(0.3);
        //   a.navigate({ x: 894, y: 1888, z: 649 });
      }
    });

    this.players.onRemove((key, player) => {
      this.log(`Player removed: ${player.getFullName()}`);
      player.dispose();

      // If the removed player was the host, transfer host to another player
      // TODO

      // Tear down the room if the last player has left it.
      if (this.players.size === 0) {
        this.log('Last player left, tearing down room.');
        this.dispose();
      }
    });
  }

  getWorld(): World {
    assert(this.world, 'Game world has not been initialized yet.');
    return this.world;
  }

  private initializeAsHost(player: Player) {
    this.log('Host is: ' + player.getFullName());
    this.host = player;
    const hostSocket = player.socket;
    hostSocket.on('agentPosition', ({ id, x, y, z }) => {
      this.agents.get(id)?.setPosition(x, y, z);
    });
  }

  private initializeGameWorld(socket: Socket) {
    this.log('Initializing game world...');
    this.world = new World(socket, this);

    this.startUpdateLoop();
  }

  private startUpdateLoop() {
    this.intervalHandler.setInterval(() => {
      this.updateLoop();
    }, 1000 / 60);
  }

  private async updateLoop() {}

  /** Emits the event name and data to all clients connected to this room. */
  emit(eventName: string, data: any) {
    this.io.to(this.roomId).emit(eventName, data);
  }

  /**
   * Emits the event name and data to all players (clients) connected,
   * but allowing the data to be curated based on the player.
   */
  private emitToEachPlayer(eventName: string, data: (player: Player) => any) {
    this.players.forEach((player) => {
      player.socket.emit(eventName, data(player));
    });
  }

  on(eventName: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);

      this.io.on('connection', (socket: Socket) => {
        socket.on(eventName, (data: any) => {
          if (socket.rooms.has(this.roomId)) {
            const handlers = this.eventHandlers.get(eventName);
            handlers?.forEach((h) => h(data, socket));
          }
        });
      });
    }

    this.eventHandlers.get(eventName)?.push(handler);
  }

  log(...message: any[]) {
    console.log(`[${this.roomId}]: `, ...message);
  }

  dispose() {
    this.log('Disposing...');
    this.agents.clear();
    this.intervalHandler.clear();
  }
}
