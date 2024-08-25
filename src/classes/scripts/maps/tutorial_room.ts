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

    room.players.onAdd(async (key, player) => {
      console.log('Player added');
      await room.waitUntilWorldInitialized();
      player.forceSetPosition(180.0, 1370.0, 252.0);
      console.log('Moving');
      player.rotate(0, 0, -90, true);
      const targetPoint = await room.getGameObjectById('target_table');
      room.actions.forEverybody({ save: true }).showMarker(targetPoint);
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
