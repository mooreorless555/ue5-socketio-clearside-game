import { Player } from '../player';
import { Room } from '../room';
import { CallFunctionOptions } from '../socket_integrator';
import { ClientTargeter } from './client_targeter';
import { RoomActions } from './room_actions';

export class ServerActions {
  constructor(private readonly room: Room) {}

  forPlayer(player: Player, overrides: Partial<CallFunctionOptions> = {}) {
    const targeter = new ClientTargeter([player], overrides);
    return new RoomActions(this.room, targeter);
  }
  forPlayers(players: Player[], overrides: Partial<CallFunctionOptions> = {}) {
    const targeter = new ClientTargeter(players, overrides);
    return new RoomActions(this.room, targeter);
  }
  forEverybody(overrides: Partial<CallFunctionOptions> = {}) {
    const players = [...this.room.players.values()];
    const targeter = new ClientTargeter(players, overrides);
    return new RoomActions(this.room, targeter);
  }
}
