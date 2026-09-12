import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  }
}

export default async function globalSetup() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Playwright needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Start local Supabase and see kanbons/README.md."
    );
  }

  const supabase = createClient(url, key);

  const packingLists = await supabase
    .from("packing_lists")
    .select("id")
    .limit(1);
  if (packingLists.error) throw packingLists.error;
  if ((packingLists.data ?? []).length === 0) {
    const created = await supabase
      .from("packing_lists")
      .insert({
        num_pl: 900001,
        customer: "Smoke test",
        status: "draft",
      })
      .select("id")
      .single();
    if (created.error) throw created.error;
    const line = await supabase.from("packing_list_lines").insert({
      packing_list_id: created.data.id,
      product: "Smoke line",
      yards_pieces: 1,
    });
    if (line.error) throw line.error;
  }

  const shipments = await supabase.from("shipments").select("id").limit(1);
  if (shipments.error) throw shipments.error;
  if ((shipments.data ?? []).length === 0) {
    const created = await supabase
      .from("shipments")
      .insert({
        number: 900001,
        invoice_number: "SMOKE",
      })
      .select("id")
      .single();
    if (created.error) throw created.error;
    const line = await supabase.from("shipment_lines").insert({
      shipment_id: created.data.id,
      product: "Smoke line",
      yards_pcs: 1,
    });
    if (line.error) throw line.error;
  }
}
