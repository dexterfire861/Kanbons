import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

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
  try {
    return await fetch(input, init);
  } finally {
    console.log(
      `[kanbons ${Math.round(performance.now() - start)}ms] ${requestLabel(input, init)}`
    );
  }
}

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { global: { fetch: timedFetch } }
);
