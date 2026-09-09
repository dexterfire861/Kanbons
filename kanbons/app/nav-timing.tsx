"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function NavTiming() {
  const pathname = usePathname();
  const previous = useRef<number | null>(null);

  useEffect(() => {
    const now = performance.now();
    const nav = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming | undefined;
    if (nav && previous.current == null) {
      const ms = Math.round(nav.duration);
      const ttfb = Math.round(nav.responseStart);
      console.log(`[kanbons nav ${ms}ms] ${pathname} (ttfb ${ttfb}ms)`);
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
          hypothesisId: "A",
          location: "app/nav-timing.tsx",
          message: "client nav timing",
          data: { pathname, ms, ttfb, kind: "first" },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    } else if (previous.current != null) {
      const ms = Math.round(now - previous.current);
      console.log(`[kanbons nav ${ms}ms] ${pathname}`);
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
          hypothesisId: "A",
          location: "app/nav-timing.tsx",
          message: "client nav timing",
          data: { pathname, ms, kind: "client" },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    }
    previous.current = now;
  }, [pathname]);

  return null;
}
