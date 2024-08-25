import { Callback } from '../../utils/types';
import { CallbackManager } from '../callback_manager';
import { Entity } from '../entity';
import { EntityComponent } from './component';
import { signal } from '@preact/signals';

export class AmmoComponent<T extends Entity> extends EntityComponent<T> {
  private ammo = signal(100);
  private maxAmmo = signal(100);
  private onHealthChangedCallbackManager = new CallbackManager<number>();
  private onEmptyClipCallbackManager = new CallbackManager<number>();

  getAmmo(): number {
    return this.ammo.value;
  }
  setAmmo(ammo: number): void {
    this.ammo.value = ammo;
    this.onHealthChangedCallbackManager.invoke(ammo);

    // Check for out of ammo
    if (ammo <= 0) {
      this.onEmptyClipCallbackManager.invoke(ammo);
    }
  }
  decreaseAmmo(amount: number): void {
    this.setAmmo(this.getAmmo() - amount);
  }
  getMaxAmmo(): number {
    return this.maxAmmo.value;
  }
  setMaxAmmo(maxHealth: number): void {
    this.maxAmmo.value = maxHealth;
  }
  onAmmoChanged(callback: Callback<number>) {
    this.onHealthChangedCallbackManager.add(callback);
  }
  onEmptyClip(callback: Callback<number>) {
    this.onEmptyClipCallbackManager.add(callback);
  }
}
