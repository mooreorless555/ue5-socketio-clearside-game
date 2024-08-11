export class IntervalHandler {
  timeouts: any[] = [];
  intervals: any[] = [];
  setInterval(callback: Function, intervalMs: number = 0) {
    const interval = setInterval(callback, intervalMs);
    this.intervals.push(interval);
  }
  setTimeout(callback: Function, timeoutMs: number = 0) {
    const timeout = setTimeout(callback, timeoutMs);
    this.timeouts.push(timeout);
  }

  clear() {
    this.timeouts.forEach(clearTimeout);
    this.intervals.forEach(clearInterval);
  }
}
