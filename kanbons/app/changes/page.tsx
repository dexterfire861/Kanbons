import {
  changeFieldLabel,
  changePageLabel,
  listChanges,
} from "@/lib/models/change_log";
import { PageIntro } from "@/app/ui/page-intro";

function dash(value: string | null) {
  if (value == null || value === "") return "—";
  return value;
}

export default async function ChangesPage() {
  const rows = await listChanges();

  return (
    <main className="p-6">
      <PageIntro
        title="Change history"
        what="Every stock, warehouse count, name match, and container edit. Who is Admin until people sign in."
        columns={[
          { name: "When", meaning: "When the change was saved." },
          { name: "Who", meaning: "Who saved it." },
          { name: "Page", meaning: "Stock, Name matches, or Incoming containers." },
          { name: "Field", meaning: "What number or name changed." },
          { name: "From / To", meaning: "The old value and the new value." },
        ]}
      />

      {rows.length === 0 ? (
        <p className="page-note">No changes recorded yet.</p>
      ) : (
        <div className="sheet">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Page</th>
                <th>Field</th>
                <th>From</th>
                <th>To</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="num">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td>{row.who === "admin" ? "Admin" : row.who}</td>
                  <td>{changePageLabel(row.table_name)}</td>
                  <td>{changeFieldLabel(row.field)}</td>
                  <td>{dash(row.from_value)}</td>
                  <td>{dash(row.to_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
