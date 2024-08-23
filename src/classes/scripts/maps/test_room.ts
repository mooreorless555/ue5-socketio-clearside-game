import { waitUntilTrue } from '../../../utils/fallback';
import { doNTimes } from '../../../utils/repeat';
import { wait } from '../../../utils/wait';
import { Agent } from '../../agent';
import { EntityTypeChecker } from '../../entity_type_checker';
import { GameObject } from '../../game_object';
import { TriggerBox } from '../../game_objects/trigger_box';
import { Player } from '../../player';
import { Room } from '../../room';
import { MapScript } from '../core';

const script: MapScript = {
  async run(room) {
    console.log('RUNNING test room script');

    // Do not continue to execute until first player joins.
    await waitUntilTrue(() => room.players.size > 0);
    await room.waitUntilWorldInitialized();

    // setTimeout(() => {
    //   room.actions.forEverybody({ save: true }).showPrimaryNotification({
    //     title: 'Hello',
    //     subtitle: 'World',
    //   });
    // }, 3000);

    // await wait(3000);
    // console.log('Creating one agent.');
    // const a = await room.actions.forEverybody().spawnEnemy('firstone');
    // const b = await room.actions.forEverybody().spawnEnemy('guy');
    // const playerStarts = await room.getWorld().getPlayerStarts();
    // a.getAgent().setPositionTo(playerStarts[1]);
    // b.getAgent().setPositionTo(playerStarts[2]);
    const box = await room.getWorld().getGameObjectById('test2');
    box?.onHit(async ({ projectile }) => {
      box.callFunction('SetText', 'OUCH!', { save: true, callOnOwner: true });
    });

    // await wait(1000);
    // b.getAgent().aimAt(box!);
    // await wait(3000);
    // await doNTimes(() => b.getAgent().shootLeftGlove(), 1, 100);
    // await wait(2000);
    // b.getAgent().aimAt(box!);
    // await wait(3000);
    // await doNTimes(() => b.getAgent().shootLeftGlove(), 1, 100);

    return {
      stop: () => {
        console.log('Removing room script.');
      },
    };
  },
};

export default script;
