import { createClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { isAppRole, type AppRole } from "@/lib/auth/permissions";
import { okMaybe } from "./result";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function getProfile(id: string): Promise<{
  id: string;
  name: string;
  role: AppRole;
} | null> {
  const supabase = await createClient();
  const row = await okMaybe(
    await supabase
      .from("profiles")
      .select("id, name, role")
      .eq("id", id)
      .maybeSingle()
  );
  if (!row || !isAppRole(row.role)) return null;
  return { id: row.id, name: row.name, role: row.role };
}
