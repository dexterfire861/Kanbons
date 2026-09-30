import Link from "next/link";
import { getContadorStory, listContador } from "@/lib/models/contador";
import { listAgentNotesForProduct, listRecentAgentNotes } from "@/lib/models/agent_notes";
import { FindBar } from "@/app/ui/find-bar";
import { PageIntro } from "@/app/ui/page-intro";
import { AdjustCount } from "./adjust";
import { ContadorTable } from "./table";

function fmt(value: number | null | undefined) {
  if (value == null) return "—";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default async function ContadorPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; product?: string }>;
}) {
  const { q, product } = await searchParams;
  const productId = product ? Number(product) : null;
  const rows = await listContador({ q });
  const latestNote = (await listRecentAgentNotes(1))[0];
  const story =
    productId != null && Number.isFinite(productId)
      ? await getContadorStory(productId)
      : null;
  const notes =
    story?.row.product_id != null
      ? await listAgentNotesForProduct(story.row.product_id)
      : [];

  return (
    <main className="p-6">
      <PageIntro
        title="Warehouse check"
        what="Compares paperwork to the floor. The largest gaps are at the top. Click a product to see the containers, packing lists, and floor count behind the numbers. Light rows do not match. Red rows are off by more than 10%. Adjust count adds to the warehouse number and updates Stock."
        columns={[
          { name: "SKU / Name", meaning: "The product. Click the row to open it." },
          { name: "Received", meaning: "Sum of incoming container lines." },
          { name: "Sold", meaning: "Sum of packing-list lines." },
          { name: "Remaining", meaning: "Received minus sold." },
          { name: "Book qty", meaning: "Packs on Stock." },
          { name: "Warehouse", meaning: "Last floor count from Stock." },
        ]}
      />

      <p className="page-note">
        <Link href="/changes" className="underline">
          Change history
        </Link>
      </p>

      {latestNote ? (
        <p className="page-note">
          {latestNote.note} Would do: {latestNote.proposed_action}
        </p>
      ) : null}

      <FindBar action="/contador" label="Find a product" defaultValue={q} />

      {q ? (
        <p className="page-note">
          {rows.length === 0
            ? "No products match that search."
            : `Showing ${rows.length} match${rows.length === 1 ? "" : "es"}.`}
        </p>
      ) : (
        <p className="page-note">
          {rows.length === 0
            ? "None that do not match. Type to find a product."
            : "Showing products that do not match, largest gap first. Type to find others."}
        </p>
      )}

      {product && !story ? (
        <p className="page-note">That product is not on Warehouse check.</p>
      ) : null}

      {story ? (
        <section className="mb-6 grid max-w-3xl gap-3 border border-zinc-300 p-4">
          <h2 className="text-lg font-semibold">
            {story.row.num} — {story.row.product}
          </h2>
          <p className="text-sm">
            Book qty {fmt(story.row.book_quantity)}. Warehouse{" "}
            {fmt(story.row.warehouse)}. Remaining {fmt(story.row.difference)}.
          </p>
          <p className="text-sm">{story.reason}</p>
          <AdjustCount row={story.row} />

          <h3 className="text-sm font-semibold">Received from containers</h3>
          {story.receipts.length === 0 ? (
            <p className="text-sm text-zinc-600">No container lines for this product.</p>
          ) : (
            <ul className="grid gap-1 text-sm">
              {story.receipts.map((line, index) => (
                <li key={`${line.container}-${index}`}>
                  {line.container} · {line.invoice} · {line.written} ·{" "}
                  {fmt(line.yards)}
                </li>
              ))}
            </ul>
          )}

          <h3 className="text-sm font-semibold">Sold on packing lists</h3>
          {story.sales.length === 0 ? (
            <p className="text-sm text-zinc-600">No packing-list lines for this product.</p>
          ) : (
            <ul className="grid gap-1 text-sm">
              {story.sales.map((line, index) => (
                <li key={`${line.listNumber}-${index}`}>
                  {line.listNumber} · {line.customer} · {fmt(line.yards)}
                </li>
              ))}
            </ul>
          )}

          <h3 className="text-sm font-semibold">Notes</h3>
          {notes.length === 0 ? (
            <p className="text-sm text-zinc-600">No notes for this product yet.</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {notes.map((item) => (
                <li key={item.id}>
                  <p>{item.note}</p>
                  <p className="text-zinc-600">Would do: {item.proposed_action}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <ContadorTable
        rows={rows}
        q={q}
        openId={story?.row.product_id ?? undefined}
      />
    </main>
  );
}
