import { Callback } from '../../utils/types';
import { Player } from '../player';
import { CallFunctionOptions } from '../socket_integrator';

export class ClientTargeter {
  constructor(
    private readonly players: Player[],
    private readonly overrides: Partial<CallFunctionOptions> = {}
  ) {}
  forEach(callback: Callback<Player>) {
    this.players.forEach(callback);
  }
  getSockets() {
    return this.players.filter((p) => p.socket).map((p) => p.socket);
  }
  getOverrides(): Partial<CallFunctionOptions> {
    return this.overrides;
  }
}
