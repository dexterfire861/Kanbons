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
      console.log(
        `[kanbons nav ${Math.round(nav.duration)}ms] ${pathname} (ttfb ${Math.round(nav.responseStart)}ms)`
      );
    } else if (previous.current != null) {
      console.log(
        `[kanbons nav ${Math.round(now - previous.current)}ms] ${pathname}`
      );
    }
    previous.current = now;
  }, [pathname]);

  return null;
}
