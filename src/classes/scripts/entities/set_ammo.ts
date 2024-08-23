import { Agent } from '../../agent';
import { TriggerBox } from '../../game_objects/trigger_box';
import { GameScript } from '../core';

const script: GameScript = {
  run({ gameObject, args }) {
    const ammo = args.get('ammo');
    const triggerBox = TriggerBox.from<Agent>(gameObject);
    triggerBox.setActorSearchFn(
      (room) => room.getPlayersAndAgents() as Agent[]
    );
    triggerBox.onEnter((agent) => {
      if (ammo === undefined) return;
      agent.setLeftGloveAmmo(ammo);
      agent.setRightGloveAmmo(ammo);
    });

    return {
      stop: () => {
        console.log('Removing ammo box script.');
      },
    };
  },
};

export default script;
