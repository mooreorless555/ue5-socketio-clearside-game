import { randomUUID } from 'crypto';
import { Callback } from '../utils/types';

export class CallbackManager<T> {
  private callbacks = new Map<string, Callback<T>>();

  public add(callback: (value: T) => void) {
    const callbackId = `CALLBACK_${randomUUID()}`;
    this.callbacks.set(callbackId, callback);
  }
  public remove(callbackId: string) {
    this.callbacks.delete(callbackId);
  }
  public clear() {
    this.callbacks.clear();
  }
  public invoke(value: T) {
    this.callbacks.forEach((callback) => callback(value));
  }
}
