import { Entity } from '../entity';

export class EntityComponent<T extends Entity> {
  constructor(private readonly owner: T) {}
  getOwner(): T {
    return this.owner;
  }
}
