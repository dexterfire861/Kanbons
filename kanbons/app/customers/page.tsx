import { supabase } from "@/lib/supabase";

export default async function CustomersPage() {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, city, state, id_cust")
    .order("name");

  if (error) {
    return <pre>{error.message}</pre>;
  }

  return (
    <main className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Customers</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4">ID</th>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">City</th>
            <th className="py-2 pr-4">State</th>
            <th className="py-2 pr-4">Code</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((row) => (
            <tr key={row.id} className="border-b">
              <td className="py-2 pr-4">{row.id}</td>
              <td className="py-2 pr-4">{row.name}</td>
              <td className="py-2 pr-4">{row.city}</td>
              <td className="py-2 pr-4">{row.state}</td>
              <td className="py-2 pr-4">{row.id_cust}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}