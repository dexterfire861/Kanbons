import { supabase } from "@/lib/supabase";

export async function pingDatabase(): Promise<{ ok: boolean }> {
  try {
    const { error } = await supabase
      .from("customers")
      .select("id")
      .limit(1)
      .abortSignal(AbortSignal.timeout(3000));
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
