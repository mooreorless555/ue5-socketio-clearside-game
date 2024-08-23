import { Socket } from 'socket.io';
import { Room } from './room';
import { randomUUID } from 'crypto';

export interface CallFunctionOptions {
  save: boolean;
  sockets: Socket[];
  variableName: string;
  giveUniqueId: boolean;
  callOnOwner: boolean;
}

export type CallbackFunctionWithSocket = (socket: Socket) => Promise<void>;

export interface SavedCall {
  callback: CallbackFunctionWithSocket;
  timestamp: number;
}

export class SocketIntegrator {
  constructor(private readonly id: string) {}
  // Maintain a list of saved function calls for players joining later.
  private readonly savedFunctionCalls: Map<string, SavedCall> = new Map();
  // Maintain a list of saved variable values to set for players joining later.
  private readonly savedSetVariableCalls: Map<string, SavedCall> = new Map();

  public callFunction<T>(
    room: Room,
    eventName: string,
    name: string,
    arg: T,
    overrides: Partial<CallFunctionOptions> = {}
  ) {
    const options: CallFunctionOptions = {
      save: false,
      sockets: [],
      variableName: '',
      giveUniqueId: false,
      callOnOwner: false,
      ...overrides,
    };
    const payload = {
      id: this.id,
      variableName: options.variableName,
      functionName: name,
      functionArg: arg,
      callOnOwner: options.callOnOwner,
    };

    // If emitting to specific sockets, just emit and forget
    if (options.sockets.length) {
      options.sockets.forEach((socket) => {
        socket.emit(eventName, payload);
      });
      return;
    }

    room.emit(eventName, payload);

    if (options.save) {
      // Save the latest call for later.
      const savedCall: SavedCall = {
        callback: (socket: Socket) => {
          return new Promise((resolve) => {
            socket.emit(eventName, payload, (value: any) => {
              resolve(value);
            });
          });
        },
        timestamp: Date.now(),
      };

      const savedId = options.giveUniqueId
        ? randomUUID()
        : `${options.variableName ?? ''}${name}`;
      this.savedFunctionCalls.set(savedId, savedCall);
    }
  }

  public setVariable(room: Room, eventName: string, name: string, value: any) {
    room.emit(eventName, {
      id: this.id,
      variableName: name,
      variableValue: value,
    });

    // Save the latest call for later.
    const savedCall: SavedCall = {
      callback: (socket: Socket) => {
        return new Promise((resolve) => {
          socket.emit(
            eventName,
            {
              id: this.id,
              variableName: name,
              variableValue: value,
            },
            (value: any) => {
              resolve(value);
            }
          );
        });
      },
      timestamp: Date.now(),
    };

    this.savedSetVariableCalls.set(name, savedCall);
  }

  public async sendUpdatesToSocket(socket: Socket, room: Room) {
    // Get all saved calls and order them by timestamp.
    const sortedSavedCalls = Array.from([
      ...this.savedFunctionCalls.values(),
      ...this.savedSetVariableCalls.values(),
    ]).sort((a, b) => a.timestamp - b.timestamp);

    for (const savedCall of sortedSavedCalls) {
      room.log(`Sending saved call: ${savedCall.timestamp}`);
      await savedCall.callback(socket);
    }
  }
}
