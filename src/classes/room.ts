import { Socket } from 'socket.io';
import { SocketIOType } from '../server';
import { ObservableMap } from '../utils/observable_map';
import { Player } from './player';
import { World } from './world/world';
import { Agent } from './agent';
import assert from 'assert';
import { IntervalHandler } from './interval_handler';
import { wait } from '../utils/wait';
import { VectorBuilder } from './world/vector_builder';
import * as BABYLON from '@babylonjs/core';
import { Entity } from './entity';
import waitUntil from 'async-wait-until';
import { randomElement } from '../utils/random';
import { TriggerBox } from './game_objects/trigger_box';
import { GAME_OBJECTS } from './game_objects/repository';
import { CallFunctionOptions, SocketIntegrator } from './socket_integrator';
import { ReloadBox } from './game_objects/reload_box';
import { ServerActions } from './room_actions/server_actions';
import { ScriptManager } from './script_manager';
import { waitUntilTrue } from '../utils/fallback';
import { Callback } from '../utils/types';
import { CallbackManager } from './callback_manager';

export interface RoomOptions {
  mapScriptName: string;
}

type EventHandler = (data: any, socket: Socket) => void;

interface BlueprintFunctionMap {
  PrintText: string;
  InitializeGameWorld: undefined;
}

export class Room {
  private eventHandlers = new Map<string, EventHandler[]>();
  private world?: World;
  readonly actions = new ServerActions(this);
  private intervalHandler = new IntervalHandler();
  private playerAddedCallbackManager = new CallbackManager<Player>();
  private readonly socketIntegrator = new SocketIntegrator(this.roomId);

  private readonly scriptManager = new ScriptManager();

  private host: Player;

  readonly agents = new ObservableMap<string, Agent>();
  readonly players = new ObservableMap<string, Player>();

  loadMapScriptIfPresent() {
    // Load map script name if present
    if (this.options?.mapScriptName) {
      this.scriptManager.runScript<Room>(
        `./scripts/maps/${this.options.mapScriptName}`,
        this
      );
    }
  }

  constructor(
    readonly roomId: string,
    readonly io: SocketIOType,
    private readonly options: RoomOptions
  ) {
    this.agents.onAdd(async (key, addedAgent) => {
      await this.waitUntilWorldInitialized();

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

    this.players.onAdd(async (key, addedPlayer) => {
      // If it's the first player added, initialize the world.
      if (this.players.size === 1) {
        this.host = addedPlayer;
        this.initializeAsHost(addedPlayer);
        this.initializeGameWorld(addedPlayer.socket);
        this.loadMapScriptIfPresent();
      }

      // Emit playerAdded for the newly added player.
      this.emitToEachPlayer('playerAdded', (player) => {
        return {
          ...addedPlayer.toJson(),
          isMe: player.socket.id === addedPlayer.socket.id,
        };
      });

      await this.waitUntilWorldInitialized();

      const playerStarts = await this.getWorld().getPlayerStarts();
      const playerStart = randomElement(playerStarts);

      // Move the new player to a player start.
      addedPlayer.setPositionTo(playerStart);
      const { x, y, z } = playerStart.getRotation();
      addedPlayer.rotate(x, y, z);

      // Retroactively add the players already in the room for the added player.
      this.players.forEach((player) => {
        if (player.socket.id === addedPlayer.socket.id) return;
        addedPlayer.socket.emit('playerAdded', {
          ...player.toJson(),
          isMe: false,
        });
      });

      // Retroactively emit room updates for player
      this.socketIntegrator.sendUpdatesToSocket(addedPlayer.socket, this);

      // Add AI agents currently in the room.
      this.agents.forEach((agent) => {
        addedPlayer.socket.emit('playerAdded', agent.toJson());
      });

      // Run playeradded callbacks
      this.playerAddedCallbackManager.invoke(addedPlayer);

      // Set up a disconnect handler for the new player.
      addedPlayer.socket.on('disconnect', () => {
        this.players.delete(addedPlayer.socket.id);
      });

      // Handle hit events received from client
      addedPlayer.socket.on('hitEvent', ({ owner, position }) => {
        console.log('HIT EVENT: ', owner, position);
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

      // Emit game object updates retroactively.
      this.getWorld()
        .getAllGameObjects()
        .forEach((gameObject) => {
          gameObject.sendUpdatesToSocket(addedPlayer.socket);
        });

      // Emit player updates retroactively
      this.players.forEach((player) => {
        player.sendUpdatesToSocket(addedPlayer.socket);
      });
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
    this.callFunction('InitializeGameWorld', undefined, { sockets: [socket] });
    this.world = new World(socket, this);
  }

  waitUntilWorldInitialized(): Promise<boolean> {
    if (this.world) return Promise.resolve(true);
    return waitUntil(() => this.world !== undefined, { timeout: 10000 });
  }

  private startUpdateLoop() {
    this.intervalHandler.setInterval(() => {
      this.updateLoop();
    }, 1000 / 60);
  }

  private async updateLoop() {}

  onPlayerAdded(callback: Callback<Player>) {
    this.playerAddedCallbackManager.add(callback);
  }

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
    this.players.clear();
    this.agents.clear();
    this.playerAddedCallbackManager.clear();
    this.intervalHandler.clear();
    this.scriptManager.dispose();
    this.world?.dispose();
  }

  callFunction<K extends keyof BlueprintFunctionMap>(
    name: K,
    arg: BlueprintFunctionMap[K],
    overrides: Partial<CallFunctionOptions> = {}
  ) {
    this.socketIntegrator.callFunction(
      this,
      'roomCallFunction',
      name,
      arg,
      overrides
    );
  }

  getPlayersAndAgents(): Agent[] {
    return [...this.players.values(), ...this.agents.values()];
  }

  setTimeout(func: () => void, timeout: number) {
    this.intervalHandler.setTimeout(func, timeout);
  }
}
