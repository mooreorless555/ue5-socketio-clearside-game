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
    console.log('RUNNING tutorial room script');

    room.onPlayerAdded(async (player) => {
      await room.waitUntilWorldInitialized();
      const playerStarts = await room.getWorld().getPlayerStarts();
      const playerStart = playerStarts[0];
      player.forceSetPosition(playerStart.x, playerStart.y, playerStart.z);
      player.rotate(0, 0, -90, true);
    });

    // Do not continue to execute until first player joins.
    await waitUntilTrue(() => room.players.size > 0);
    console.log('True!');

    return {
      stop: () => {
        console.log('Removing room script.');
      },
    };
  },
};

export default script;
