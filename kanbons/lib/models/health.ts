import { createClient } from "@/lib/supabase";

export async function pingDatabase(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase
      .rpc("database_ping")
      .abortSignal(AbortSignal.timeout(3000));
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
