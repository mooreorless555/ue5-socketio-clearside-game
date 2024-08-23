import { GameObject } from '../game_object';
import { Room } from '../room';

export interface ReturnType {
  stop: () => void;
  [key: string]: () => void;
}

export type ServerScriptArgs = {
  gameObject: GameObject;
  args: Map<string, any>;
};

export interface GameScript {
  run(config: ServerScriptArgs): Promise<ReturnType> | ReturnType;
}

export interface MapScript {
  run(room: Room): Promise<{ stop: () => void }>;
}
