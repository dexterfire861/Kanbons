import Link from "next/link";
import type { CountryTile } from "@/lib/models/shipments";

function dash(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

export function CountryTiles({ tiles }: { tiles: CountryTile[] }) {
  return (
    <section className="tiles">
      {tiles.map((tile) => (
        <article key={tile.countryKey || "none"} className="tile">
          <h2>{tile.country}</h2>
          <p>
            {tile.shipmentCount === 1 ? "1 container" : `${tile.shipmentCount} containers`}
          </p>
          <p className="mt-2 text-zinc-600">
            {tile.products.length === 0
              ? "No products listed yet."
              : tile.products.join(", ")}
          </p>
          <ul>
            {tile.recent.map((row) => (
              <li key={row.id}>
                <Link href={`/shipments/${row.id}`} className="underline">
                  Container {row.number}
                </Link>
                {" · "}
                {dash(row.invoice_number)}
                {" · "}
                {dash(row.arrival_date)}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
