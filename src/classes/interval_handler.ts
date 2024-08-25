import { randomUUID } from 'crypto';

export class IntervalHandler {
  timeouts: Map<string, number> = new Map();
  intervals: Map<string, number> = new Map();

  setInterval(callback: Function, intervalMs: number = 0) {
    const key = randomUUID();
    const interval = setInterval(callback, intervalMs);
    this.intervals.set(key, interval);
    return key;
  }

  setTimeout(callback: Function, timeoutMs: number = 0) {
    const key = randomUUID();
    const timeout = setTimeout(callback, timeoutMs);
    this.timeouts.set(key, timeout);
    return key;
  }

  removeInterval(key: string) {
    const interval = this.intervals.get(key);
    clearInterval(interval);
    this.intervals.delete(key);
  }

  removeTimeout(key: string) {
    const timeout = this.timeouts.get(key);
    clearTimeout(timeout);
    this.timeouts.delete(key);
  }

  waitUntil(func: () => boolean) {
    console.log('Interval waitUntil begun.');
    return new Promise<void>(async (resolve) => {
      this.setInterval(() => {
        const result = func();
        if (result) {
          resolve();
        }
      }, 1000 / 20);
    });
  }

  // TODO: this might not actually work cuz of the while loop, should fix
  waitUntilAsync(func: () => Promise<boolean>) {
    return new Promise<void>(async (resolve) => {
      while (true) {
        const result = await func();
        if (result) {
          resolve();
        }
      }
    });
  }

  clear() {
    this.timeouts.forEach(clearTimeout);
    this.intervals.forEach(clearInterval);
    this.timeouts.clear();
    this.intervals.clear();
  }
}
