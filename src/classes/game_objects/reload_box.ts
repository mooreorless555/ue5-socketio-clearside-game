import { Agent } from '../agent';
import { Entity } from '../entity';
import { EntityTypeChecker } from '../entity_type_checker';
import { GameObject } from '../game_object';
import { Room } from '../room';
import { TriggerBox } from './trigger_box';

export class ReloadBox<T extends Agent> extends TriggerBox<T> {
  constructor(gameObject: GameObject) {
    super(gameObject);
    this.setActorSearchFn((room) => room.getPlayersAndAgents() as T[]);
    this.onEnter((agent) => {
      console.log('Entered lose ammo box');
      agent.setLeftGloveAmmo(0);
      agent.setRightGloveAmmo(0);

      if (EntityTypeChecker.isPlayer(agent)) {
        gameObject
          .getRoom()
          .actions.forPlayer(agent)
          .printToConsole('You lost your ammo.');
      }
    });
  }
}
