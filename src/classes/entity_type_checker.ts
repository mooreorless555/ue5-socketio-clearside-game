import { Entity } from './entity';
import { Player } from './player';

export class EntityTypeChecker {
  static isPlayer(entity: Entity): entity is Player {
    return entity instanceof Player;
  }
}
