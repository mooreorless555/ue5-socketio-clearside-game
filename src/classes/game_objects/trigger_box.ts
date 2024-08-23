import { interval, takeUntil } from 'rxjs';
import { Agent } from '../agent';
import { GameObject } from '../game_object';
import { Room } from '../room';
import { VectorBuilder } from '../world/vector_builder';
import { Entity } from '../entity';
import { Callback, XYZ } from '../../utils/types';

export class TriggerBox<T extends Entity> extends GameObject {
  actorsFn: (room: Room) => T[] = () => [];

  onActorEnterCallbacks: Callback<T>[] = [];
  onActorLeaveCallbacks: Callback<T>[] = [];
  overlappingActors = new Map<string, T>();

  static async fromId<T extends Entity>(
    id: string,
    room: Room
  ): Promise<TriggerBox<T>> {
    const gameObject = await super.fromId(id, room);
    return TriggerBox.from(gameObject);
  }

  static from<T extends Entity>(gameObject: GameObject): TriggerBox<T> {
    return new TriggerBox(gameObject);
  }

  setActorSearchFn(fn: (room: Room) => T[]) {
    this.actorsFn = fn;
  }

  constructor(private readonly gameObject: GameObject) {
    super(
      gameObject.getId(),
      gameObject.extent,
      gameObject.getPosition(),
      gameObject.getRoom()
    );
    this.tick();
  }

  tick() {
    interval(1000 / 60)
      .pipe(takeUntil(this.gameObject.disposed$))
      .subscribe(() => {
        const actors = this.actorsFn(this.room);
        if (actors.length === 0) return;
        for (const actor of actors) {
          if (this.overlappingActors.has(actor.getId())) {
            if (!this.isWithinBounds(actor.getPosition())) {
              this.overlappingActors.delete(actor.getId());
              this.onActorLeaveCallbacks.forEach((cb) => cb(actor));
            }
            continue;
          }

          if (this.isWithinBounds(actor.getPosition())) {
            this.overlappingActors.set(actor.getId(), actor);
            this.onActorEnterCallbacks.forEach((cb) => cb(actor));
          }
        }
      });
  }

  onEnter(callback: Callback<T>) {
    this.onActorEnterCallbacks.push(callback);
  }

  onLeave(callback: Callback<T>) {
    this.onActorLeaveCallbacks.push(callback);
  }
}
