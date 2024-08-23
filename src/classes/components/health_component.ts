import { first } from 'rxjs';
import { Callback } from '../../utils/types';
import { CallbackManager } from '../callback_manager';
import { Entity } from '../entity';
import { EntityComponent } from './component';
import { signal } from '@preact/signals';

export class HealthComponent<T extends Entity> extends EntityComponent<T> {
  private health = signal(100);
  private maxHealth = signal(100);
  private onHealthChangedCallbackManager = new CallbackManager<number>();
  private onDeathFn: Callback<void> = () => {};

  getHealth(): number {
    return this.health.value;
  }
  setHealth(health: number): void {
    this.health.value = health;
    this.onHealthChangedCallbackManager.invoke(health);

    // Check for death
    if (health <= 0) {
      this.onDeathFn();
    }
  }
  decreaseHealth(amount: number): void {
    this.setHealth(this.getHealth() - amount);
  }
  getMaxHealth(): number {
    return this.maxHealth.value;
  }
  setMaxHealth(maxHealth: number): void {
    this.maxHealth.value = maxHealth;
  }
  onHealthChanged(callback: Callback<number>) {
    this.onHealthChangedCallbackManager.add(callback);
  }
  onDeath(callback: Callback<void>) {
    this.onDeathFn = callback;
  }
}
