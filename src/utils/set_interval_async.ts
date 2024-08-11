export async function setIntervalAsync(
  callback: Function,
  intervalMs: number = 1000
) {
  while (true) {
    await callback();
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
