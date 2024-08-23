import { wait } from './wait';

export async function doNTimes(
  f: () => void,
  n: number,
  intervalMs: number = 0
) {
  for (let i = 0; i < n; i++) {
    await f();
    await wait(intervalMs);
  }
}

export async function cycleBetween(funcs: Function[], intervalMs: number = 0) {
  for (const func of funcs) {
    await func();
    await wait(intervalMs);
  }
}
