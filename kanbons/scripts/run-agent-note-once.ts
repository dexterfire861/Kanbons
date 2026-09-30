import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { writeDailyNote } from "../lib/agent-note";
import { runWithClient } from "../lib/supabase";
import type { Database } from "../lib/database.types";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match || process.env[match[1]]) continue;
  process.env[match[1]] = match[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!url.includes("127.0.0.1") && !url.includes("localhost")) {
  throw new Error("This one-shot only runs against the local database.");
}

const serviceRole =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const db = createClient<Database>(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const since = process.argv[2];
  const result = await runWithClient(db, () =>
    writeDailyNote(since ? { since } : undefined)
  );
  if (!result.ok) {
    console.error(result.message);
    process.exitCode = 1;
    return;
  }
  console.log(result.note);
  console.log(`Would do: ${result.proposedAction}`);
}

void main();
