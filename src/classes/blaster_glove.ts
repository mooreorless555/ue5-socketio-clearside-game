import { doNTimes } from '../utils/repeat';
import { Callback, RollPitchYaw } from '../utils/types';
import { Agent } from './agent';
import { AmmoComponent } from './components/ammo_component';
import { Entity } from './entity';
import { IntervalHandler } from './interval_handler';
import { VectorBuilder } from './world/vector_builder';

export interface BlasterGloveOptions {
  name: string;
  maxAmmo: number;
  shotsPerBurst: number;
  /** Interval is in milliseconds */
  intervalBetweenShots: number;
  /** Cooldown between bursts (after the burst is complete) */
  cooldownBetweenBursts: number;
}

const DEFAULT_BLASTER_GLOVE_OPTIONS: BlasterGloveOptions = {
  name: 'Default Blaster Glove',
  maxAmmo: 100,
  shotsPerBurst: 3,
  intervalBetweenShots: 100,
  cooldownBetweenBursts: 500,
};

export class BlasterGlove<T extends Agent> {
  protected options: BlasterGloveOptions = {
    ...DEFAULT_BLASTER_GLOVE_OPTIONS,
    ...this.overrides,
  };
  protected readonly ammoComponent = new AmmoComponent(this.owner);
  private readonly intervalHandler = new IntervalHandler();
  private canShoot = true;

  /** Shoot function, based on which hand the glove is attached to. */
  private shootFn: Callback<void> = () => {};
  private setAmmoFn: Callback<number> = (value: number) => {};
  private getHandRotation: () => RollPitchYaw = () =>
    VectorBuilder.zero().asRollPitchYaw();

  constructor(
    private readonly owner: T,
    private readonly overrides: Partial<BlasterGloveOptions> = {}
  ) {
    this.ammoComponent.onAmmoChanged((ammo) => {
      this.setAmmoFn(ammo);
    });
  }

  attachToLeftHand() {
    this.shootFn = () => this.owner.callFunction('ShootLeftGlove', undefined);
    this.setAmmoFn = (value: number) =>
      this.owner.callFunction('SetLeftGloveAmmo', value);
    this.getHandRotation = () => this.owner.leftHandRot;
    return this;
  }

  attachToRightHand() {
    this.shootFn = () => this.owner.callFunction('ShootRightGlove', undefined);
    this.setAmmoFn = (value: number) =>
      this.owner.callFunction('SetRightGloveAmmo', value);
    this.getHandRotation = () => this.owner.rightHandRot;
    return this;
  }

  shoot() {
    const fullCooldown =
      this.options.shotsPerBurst * this.options.intervalBetweenShots +
      this.options.cooldownBetweenBursts;

    if (!this.canShoot) return;
    this.canShoot = false;
    this.intervalHandler.setInterval(
      () => (this.canShoot = true),
      fullCooldown
    );
    doNTimes(
      () => this.shootBlasterGloveAndSpawnProjectilesOnServer(),
      this.options.shotsPerBurst,
      this.options.intervalBetweenShots
    );
    this.ammoComponent.decreaseAmmo(1);
  }

  private shootBlasterGloveAndSpawnProjectilesOnServer() {
    this.shootFn();
    this.owner
      .getRoom()
      .getWorld()
      .createProjectile(
        this.owner.getPosition(),
        this.getHandRotation(),
        3000,
        this.owner
      );
  }
}
