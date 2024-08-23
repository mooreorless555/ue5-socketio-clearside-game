import { Agent } from '../../agent';
import { GameObject } from '../../game_object';
import { TriggerBox } from '../../game_objects/trigger_box';
import { GameScript } from '../core';

const script: GameScript = {
  async run({ gameObject, args }) {
    const target = args.get('target');
    const scriptName = args.get('scriptName');
    const scriptArgs = args.get('scriptArgs');
    const funcName = args.get('funcName');
    const argsMap = new Map(Object.entries(scriptArgs));

    let targetGameObject: GameObject | undefined = undefined;
    if (!target) {
      targetGameObject = gameObject;
    } else {
      targetGameObject = await gameObject
        .getRoom()
        .getWorld()
        .getGameObjectById(target);
    }

    const script = await targetGameObject?.addScript(
      `entities/${scriptName}`,
      argsMap
    );

    gameObject.onHit(({ projectile }) => {
      const owner = projectile.getOwner() as Agent;
      script?.[funcName]();
    });
    return {
      stop: () => {
        console.log('Removing on hit box script.');
      },
    };
  },
};

export default script;
