"use client";

import { useRouter } from "next/navigation";
import type { ContadorRow } from "@/lib/models/contador";
import { FoldSheet } from "@/app/ui/fold-sheet";

function fmt(value: number | null | undefined) {
  if (value == null) return "";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function bookBasis(row: ContadorRow): number | null {
  if (row.book_measurement != null) return Number(row.book_measurement);
  if (row.book_quantity != null) return Number(row.book_quantity);
  return null;
}

function bigGap(left: number | null | undefined, right: number | null): boolean {
  if (left == null || right == null) return false;
  const gap = Math.abs(Number(left) - right);
  const base = Math.max(Math.abs(Number(left)), Math.abs(right));
  if (base <= 0.01) return gap > 0.01;
  return gap / base > 0.1;
}

export function ContadorTable({
  rows,
  q,
  openId,
}: {
  rows: ContadorRow[];
  q?: string;
  openId?: number;
}) {
  const router = useRouter();

  function open(row: ContadorRow) {
    if (row.product_id == null) return;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("product", String(row.product_id));
    router.push(`/contador?${params}`);
  }

  return (
    <FoldSheet>
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
            const basis = bookBasis(row);
            const big =
              bigGap(row.difference, basis) || bigGap(row.warehouse, basis);
            const tone = big ? "row-big" : mismatch ? "row-off" : undefined;
            const selected = row.product_id === openId;
            return (
              <tr
                key={row.product_id}
                className={`${tone ?? ""} ${selected ? "font-semibold" : ""} cursor-pointer`}
                onClick={() => open(row)}
              >
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
    </FoldSheet>
  );
}
