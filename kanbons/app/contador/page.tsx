import { listContador } from "@/lib/models/contador";
import { timePage } from "@/lib/timing";
import { PageIntro } from "@/app/ui/page-intro";

function fmt(value: number | null | undefined) {
  if (value == null) return "";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default async function ContadorPage() {
  const rows = await timePage("/contador", () => listContador());

  return (
    <main className="p-6">
      <PageIntro
        title="Warehouse check"
        what="Compares paperwork to the floor. You cannot type here. Change warehouse counts on Stock. Highlighted rows do not match."
        columns={[
          { name: "SKU / Name", meaning: "The product." },
          { name: "Received", meaning: "Sum of incoming container lines." },
          { name: "Sold", meaning: "Sum of packing-list lines." },
          { name: "Remaining", meaning: "Received minus sold." },
          { name: "Book qty", meaning: "Packs on Stock." },
          { name: "Warehouse", meaning: "Last floor count from Stock." },
        ]}
      />

      <div className="sheet">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Received</th>
              <th>Sold</th>
              <th>Remaining</th>
              <th>Book qty</th>
              <th>Warehouse</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const mismatch = row.book_mismatch || row.warehouse_mismatch;
              return (
                <tr key={row.product_id} className={mismatch ? "bg-red-50" : undefined}>
                  <td className="num">{row.num}</td>
                  <td>{row.product}</td>
                  <td className="num">{fmt(row.have)}</td>
                  <td className="num">{fmt(row.sold)}</td>
                  <td className="num">{fmt(row.difference)}</td>
                  <td className="num">{fmt(row.book_quantity)}</td>
                  <td className="num">{fmt(row.warehouse)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
