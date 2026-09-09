export function debugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
) {
  // #region agent log
  fetch("http://127.0.0.1:7252/ingest/e44c2aac-b268-4e3e-97da-4ac2248eb4ef", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "354b32",
    },
    body: JSON.stringify({
      sessionId: "354b32",
      runId: "post-fix",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

export async function timePage<T>(
  path: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const ms = Math.round(performance.now() - start);
    console.log(`[kanbons page ${path} ${ms}ms]`);
    debugLog("C", "lib/timing.ts:timePage", "page data load", { path, ms });
  }
}
