import { Agent } from '../../agent';
import { TriggerBox } from '../../game_objects/trigger_box';
import { GameScript } from '../core';

const script: GameScript = {
  async run({ gameObject, args }) {
    return {
      stop: () => {
        console.log('Removing toggle lerp script.');
      },
      toggle: () => {
        gameObject.lerpPosition({
          x: gameObject.x,
          y: gameObject.y,
          z: gameObject.z + 100,
        });
      },
    };
  },
};

export default script;
