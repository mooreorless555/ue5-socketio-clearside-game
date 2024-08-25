import waitUntil from 'async-wait-until';

export function withFallback<T>(
  func: () => T | undefined | null,
  fallback: T
): T | undefined {
  try {
    const r = func();
    if (r === undefined || r === null) {
      return fallback;
    }
  } catch (e) {
    // Error ignored
    return fallback;
  }
}

export function waitUntilTrue(
  func: () => boolean | Promise<boolean>,
  checkInterval = 50,
  timeoutMs?: number
): Promise<boolean> {
  console.log('Waiting until true...');
  return new Promise((resolve) => {
    if (timeoutMs) {
      let timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        resolve(false);
      }, timeoutMs);
    }
    let intervalId = setInterval(async () => {
      const result = await func();
      if (!!result) {
        clearInterval(intervalId);
        resolve(true);
      }
    }, checkInterval);
  });
}

export function tryCatch<T>(fn: () => T): [Error | null, T | null] {
  try {
    const data = fn();
    return [null, data];
  } catch (error) {
    return [error instanceof Error ? error : new Error(String(error)), null];
  }
}

export async function tryCatchAsync<T>(
  fn: () => Promise<T>
): Promise<[Error | null, T | null]> {
  try {
    const data = await fn();
    return [null, data];
  } catch (error) {
    return [error instanceof Error ? error : new Error(String(error)), null];
  }
}
