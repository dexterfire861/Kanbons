import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { debugLog } from "./timing";

function requestLabel(input: RequestInfo | URL, init?: RequestInit): string {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  try {
    const url = new URL(raw);
    const query = url.search.length > 120 ? `${url.search.slice(0, 120)}…` : url.search;
    return `${init?.method ?? "GET"} ${url.pathname}${query}`;
  } catch {
    return raw;
  }
}

async function timedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const start = performance.now();
  const label = requestLabel(input, init);
  const response = await fetch(input, init);
  const ms = Math.round(performance.now() - start);
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  console.log(`[kanbons ${ms}ms] ${label}`);
  // #region agent log
  debugLog("C", "lib/supabase.ts:timedFetch", "supabase http", {
    label,
    ms,
    status: response.status,
    contentLength,
  });
  // #endregion
  return response;
}

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { global: { fetch: timedFetch } }
);
