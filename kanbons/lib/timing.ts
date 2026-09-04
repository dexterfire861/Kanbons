export async function timePage<T>(
  path: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    console.log(
      `[kanbons page ${path} ${Math.round(performance.now() - start)}ms]`
    );
  }
}
