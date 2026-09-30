import { AsyncLocalStorage } from "node:async_hooks";
import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

const forcedClient = new AsyncLocalStorage<SupabaseClient<Database>>();

export function runWithClient<T>(
  client: SupabaseClient<Database>,
  fn: () => Promise<T>
): Promise<T> {
  return forcedClient.run(client, fn);
}

export const createClient = cache(async (): Promise<SupabaseClient<Database>> => {
  const forced = forcedClient.getStore();
  if (forced) return forced;
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot always write cookies. Proxy refreshes them.
          }
        },
      },
    }
  );
});
