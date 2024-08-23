export interface XYZ {
  x: number;
  y: number;
  z: number;
}

export interface RollPitchYaw {
  roll: number;
  pitch: number;
  yaw: number;
}

export type Callback<T> = (value: T) => void;
