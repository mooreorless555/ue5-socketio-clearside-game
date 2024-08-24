import { Agent } from '../../agent';
import { TriggerBox } from '../../game_objects/trigger_box';
import { IntervalHandler } from '../../interval_handler';
import { VectorBuilder } from '../../world/vector_builder';
import { GameScript } from '../core';

const script: GameScript = {
  async run({ gameObject, args }) {
    const targetId = args.get('targetId');
    const offset = VectorBuilder.fromUnrealString(args.get('offset'));
    const delay = parseFloat(args.get('delay') ?? 0); // delay in seconds
    const targetGameObject = await gameObject
      .getRoom()
      .getWorld()
      .getGameObjectById(targetId);
    const currentPosition = VectorBuilder.fromXYZ(gameObject.getPosition());
    const openPosition = currentPosition.add(offset);

    function open() {
      console.log('Current: ', gameObject.getPosition());
      gameObject.lerpPosition(openPosition.asXYZ(), 0.06);
    }

    const intervalHandler = new IntervalHandler();
    let isOpening = false;

    targetGameObject?.onHit(({ projectile }) => {
      if (!isOpening) {
        isOpening = true;
      } else {
        return;
      }
      intervalHandler.setTimeout(() => {
        // gameObject.playSound({
        //   soundName: 'MS_NoAmmo',
        //   minPitch: 1,
        //   maxPitch: 1,
        // });
        open();
        isOpening = false;
      }, delay * 1000);
    });

    return {
      stop: () => {
        intervalHandler.clear();
        console.log('Removing door on hit script.');
      },
    };
  },
};

export default script;
