import Link from "next/link";
import { listBillsOfLading } from "@/lib/models/bills_of_lading";
import { PageIntro } from "@/app/ui/page-intro";

function dash(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

export default async function BillsOfLadingPage() {
  const rows = await listBillsOfLading();

  return (
    <main className="p-6">
      <PageIntro
        title="Bills of lading"
        what="What is going out on a container. Pick confirmed packing lists and type how much fits. Leftover stays on a packing list with -2."
        columns={[
          { name: "Number", meaning: "Bill of lading number." },
          { name: "Date", meaning: "When this container is billed." },
          { name: "Status", meaning: "Draft or confirmed." },
          { name: "Lines", meaning: "Products on this container." },
        ]}
      />

      <p className="mb-4">
        <Link href="/bills-of-lading/new" className="btn-primary">
          New bill of lading
        </Link>
      </p>

      {rows.length === 0 ? (
        <p className="page-note">No bills of lading yet.</p>
      ) : (
        <div className="sheet">
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th>Date</th>
                <th>Status</th>
                <th>Lines</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.num_bol}</td>
                  <td className="num">{dash(row.date)}</td>
                  <td className="capitalize">{row.status}</td>
                  <td>
                    <Link
                      href={`/bills-of-lading/${row.id}`}
                      className="underline"
                    >
                      Lines
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
