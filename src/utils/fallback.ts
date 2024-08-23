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
  timeoutMs = 2000
): Promise<boolean> {
  console.log('Waiting until true...');
  return new Promise((resolve) => {
    let timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      resolve(false);
    }, timeoutMs);
    let intervalId = setInterval(() => {
      if (func() === true) {
        clearInterval(intervalId);
        resolve(true);
      }
    }, checkInterval);
  });
}
