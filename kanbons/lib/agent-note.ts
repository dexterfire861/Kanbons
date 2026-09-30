import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join, resolve, sep } from "path";
import { after } from "next/server";
import type { Json } from "@/lib/database.types";
import { createAgentNote, listRecentAgentNotes } from "@/lib/models/agent_notes";
import {
  changeFieldLabel,
  changePageLabel,
  listChangesSince,
} from "@/lib/models/change_log";
import {
  listContadorForProducts,
  warehouseReason,
} from "@/lib/models/contador";
import { listProductMappings } from "@/lib/models/product_mappings";
import {
  listPoIngestRunsSince,
  poSnapshotFromJson,
  type PoIngestRun,
} from "@/lib/models/po_ingest_runs";

const CLIP = 4000;
const MODEL = "gpt-5.5";
const ZONE = "America/New_York";
const END_HOUR = 17;
const EVERY_DAYS = 2;
const FILE_NAMES = ["ocr.json", "tables.json", "confirmed.json"] as const;

export type AgentNoteResult =
  | { ok: true; note: string; proposedAction: string }
  | { ok: false; message: "The note could not be written." };

let writing = false;

function repoRoot(): string {
  if (process.env.KANBONS_ROOT) return process.env.KANBONS_ROOT;
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, "PO-ingestion", "process.py"))) return dir;
    dir = resolve(dir, "..");
  }
  return resolve(process.cwd(), "..");
}

function evalDir(sourcePath: string): string | null {
  const base = resolve(repoRoot(), "data", "po_eval");
  const dir = resolve(repoRoot(), sourcePath);
  if (dir !== base && !dir.startsWith(base + sep)) return null;
  return dir;
}

function clip(text: string): string {
  if (text.length <= CLIP) return text;
  return `${text.slice(0, CLIP)}\n…`;
}

async function readEvalFiles(sourcePath: string): Promise<string> {
  const dir = evalDir(sourcePath);
  if (!dir) return "";
  const parts: string[] = [];
  for (const name of FILE_NAMES) {
    const path = join(dir, name);
    if (!existsSync(path)) continue;
    try {
      parts.push(`${name}:\n${clip(await readFile(path, "utf8"))}`);
    } catch {
      parts.push(`${name}: could not be read`);
    }
  }
  return parts.join("\n\n");
}

function jsonText(value: Json | null): string {
  if (value == null) return "";
  return clip(JSON.stringify(value));
}

function idsAndWords(run: PoIngestRun): { ids: number[]; words: string[] } {
  const ids = new Set<number>();
  const words = new Set<string>();
  for (const value of [run.gold_json, run.extracted_json]) {
    const snap = poSnapshotFromJson(value);
    if (!snap) continue;
    for (const line of snap.lines) {
      if (line.productId != null) ids.add(line.productId);
      const word = line.asWritten.trim();
      if (word) words.add(word);
    }
  }
  return { ids: [...ids], words: [...words] };
}

async function complete(prompt: string): Promise<string | null> {
  const key = process.env.AGENT_API_KEY;
  if (!key) return null;
  const url =
    process.env.AGENT_API_URL ?? "https://api.openai.com/v1/chat/completions";
  const model = MODEL;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      console.error("agent note", response.status);
      return null;
    }
    const body = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (error) {
    console.error("agent note", error);
    return null;
  }
}

function parseReply(text: string): { note: string; proposedAction: string } | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return { note: text, proposedAction: "Review this read." };
  }
  try {
    const value = JSON.parse(text.slice(start, end + 1)) as {
      note?: unknown;
      proposed_action?: unknown;
    };
    if (typeof value.note !== "string" || !value.note.trim()) return null;
    const action =
      typeof value.proposed_action === "string" && value.proposed_action.trim()
        ? value.proposed_action.trim()
        : "Review this read.";
    return { note: value.note.trim(), proposedAction: action };
  } catch {
    return { note: text, proposedAction: "Review this read." };
  }
}

function zoned(date: Date): { dayKey: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );
  return {
    dayKey: `${value.year}-${value.month}-${value.day}`,
    hour: Number(value.hour),
  };
}

function dayNumber(dayKey: string): number {
  const [year, month, day] = dayKey.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function isEndOfDay(now: Date): boolean {
  return zoned(now).hour >= END_HOUR;
}

export async function dailyNoteIsDue(now = new Date()): Promise<boolean> {
  if (!isEndOfDay(now)) return false;
  const latest = await listRecentAgentNotes(1);
  if (latest.length === 0) return true;
  const last = zoned(new Date(latest[0].created_at)).dayKey;
  return dayNumber(zoned(now).dayKey) - dayNumber(last) >= EVERY_DAYS;
}

export async function scheduleDailyNoteIfDue(): Promise<void> {
  if (writing || !process.env.AGENT_API_KEY || !isEndOfDay(new Date())) return;
  writing = true;
  let due = false;
  try {
    due = await dailyNoteIsDue();
  } catch (error) {
    writing = false;
    throw error;
  }
  if (!due) {
    writing = false;
    return;
  }
  after(async () => {
    try {
      if (!(await dailyNoteIsDue())) return;
      const result = await writeDailyNote();
      if (!result.ok) console.error("agent note", result.message);
    } catch (error) {
      console.error("agent note", error);
    } finally {
      writing = false;
    }
  });
}

export async function writeDailyNote(options?: {
  since?: string;
}): Promise<AgentNoteResult> {
  if (!process.env.AGENT_API_KEY) {
    return { ok: false, message: "The note could not be written." };
  }
  const latest = await listRecentAgentNotes(8);
  const since =
    options?.since ??
    latest[0]?.created_at ??
    new Date(Date.now() - EVERY_DAYS * 86_400_000).toISOString();
  const [runs, changes] = await Promise.all([
    listPoIngestRunsSince(since, 8),
    listChangesSince(since, 30),
  ]);
  const gathered = runs.map((run) => ({ run, ...idsAndWords(run) }));
  const productIds = [...new Set(gathered.flatMap((item) => item.ids))];
  const words = [...new Set(gathered.flatMap((item) => item.words))];
  const wanted = new Set(words.map((word) => word.toUpperCase()));
  const [mappings, rows] = await Promise.all([
    words.length === 0 ? Promise.resolve([]) : listProductMappings(),
    listContadorForProducts(productIds),
  ]);
  const related = mappings.filter((mapping) =>
    wanted.has(mapping.client_name.trim().toUpperCase())
  );
  const blocks = await Promise.all(
    gathered.map(async ({ run }) => {
      const files = await readEvalFiles(run.source_path);
      return [
        `Read ${run.id} · ${run.source_filename} · ${run.status}`,
        `extracted: ${jsonText(run.extracted_json) || "none"}`,
        `confirmed: ${jsonText(run.gold_json) || "none"}`,
        `differences: ${jsonText(run.resolved_json) || "none"}`,
        files,
      ]
        .filter(Boolean)
        .join("\n");
    })
  );
  const happened =
    changes.length === 0
      ? "No saved changes in this stretch."
      : changes
          .map(
            (change) =>
              `${changePageLabel(change.table_name)} ${changeFieldLabel(change.field)}: ${change.from_value ?? "—"} → ${change.to_value ?? "—"} (${change.who})`
          )
          .join("\n");
  const prior = latest
    .map((note) => `${note.note} Would do: ${note.proposed_action}`)
    .join("\n");
  const names =
    words.length === 0
      ? "No product names on these reads."
      : words
          .map((word) => {
            const hit = related.find(
              (mapping) =>
                mapping.client_name.trim().toUpperCase() === word.toUpperCase()
            );
            return hit
              ? `${word} is saved as ${hit.kanbons_name ?? "a product"}`
              : `${word} is not in Name matches`;
          })
          .join("\n");
  const checks = rows
    .map(
      (row) =>
        `${row.num ?? ""} ${row.product ?? ""} remaining ${row.difference ?? "—"} book ${row.book_quantity ?? "—"} warehouse ${row.warehouse ?? "—"}. ${warehouseReason(row)}`
    )
    .join("\n");

  const prompt = [
    "You write one short end-of-day note for a warehouse.",
    "You cannot change stock, names, shipments, packing lists, or code.",
    'Reply with JSON only: {"note":"...","proposed_action":"..."}',
    "The note is a few sentences about this stretch, including when nothing stood out.",
    "The proposed action is one thing a person could do, or “Nothing to do.”",
    "",
    "Earlier notes:",
    prior || "None yet.",
    "",
    "What changed:",
    happened,
    "",
    "Name matches:",
    names,
    "",
    "Warehouse check:",
    checks || "No products from these reads are on Warehouse check.",
    "",
    "Order JSON:",
    blocks.join("\n\n") || "No order reads in this stretch.",
  ].join("\n");

  const reply = await complete(prompt);
  const parsed = reply ? parseReply(reply) : null;
  if (!parsed) return { ok: false, message: "The note could not be written." };

  await createAgentNote({
    poIngestRunId: runs[0]?.id ?? null,
    productIds,
    note: parsed.note,
    proposedAction: parsed.proposedAction,
  });
  return { ok: true, note: parsed.note, proposedAction: parsed.proposedAction };
}
