import { Agent } from '../../agent';
import { EntityTypeChecker } from '../../entity_type_checker';
import { TriggerBox } from '../../game_objects/trigger_box';
import { GameScript } from '../core';

const script: GameScript = {
  run({ gameObject, args }) {
    console.log('Running reload box script with arg: ', args);

    const triggerBox = TriggerBox.from<Agent>(gameObject);
    triggerBox.setActorSearchFn(
      (room) => room.getPlayersAndAgents() as Agent[]
    );
    triggerBox.onEnter((agent) => {
      console.log('Entered reload box');
      agent.setLeftGloveAmmo(30);
      agent.setRightGloveAmmo(30);

      if (EntityTypeChecker.isPlayer(agent)) {
        gameObject
          .getRoom()
          .actions.forPlayer(agent)
          .showPrimaryNotification({ title: 'Ammo restored.', subtitle: '' });
      }
    });

    return {
      stop: () => {
        console.log('Removing reload box script.');
      },
    };
  },
};

export default script;
