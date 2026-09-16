"use client";

import { useRef, useState } from "react";
import type { ContadorRow } from "@/lib/models/contador";
import { adjustWarehouseCountAction } from "@/app/stock/actions";

function fmt(value: number | null | undefined) {
  if (value == null) return "";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function ContadorTable({ rows }: { rows: ContadorRow[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<ContadorRow | null>(null);

  function open(row: ContadorRow) {
    setSelected(row);
    dialog.current?.showModal();
  }

  return (
    <>
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
              <th />
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
                  <td>
                    {row.product_id != null ? (
                      <button
                        type="button"
                        className="underline"
                        onClick={() => open(row)}
                      >
                        Adjust count
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <dialog ref={dialog} className="box">
        <h2 className="text-lg font-semibold">Adjust count</h2>
        {selected ? (
          <>
            <p className="mt-1 text-sm text-zinc-600">
              {selected.num} — {selected.product}. This adds to the warehouse
              count on Stock.
            </p>
            <p className="mt-2 text-sm">
              Remaining {fmt(selected.difference)} · Book qty{" "}
              {fmt(selected.book_quantity)} · Warehouse {fmt(selected.warehouse)}
            </p>
            <form
              className="dialog-fields"
              action={async (formData) => {
                dialog.current?.close();
                await adjustWarehouseCountAction(formData);
              }}
            >
              <input type="hidden" name="product_id" value={selected.product_id ?? ""} />
              <label>
                <span>Add to warehouse count</span>
                <input name="delta" required />
              </label>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="border border-zinc-400 px-3 py-1 text-sm"
                  onClick={() => dialog.current?.close()}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save count
                </button>
              </div>
            </form>
          </>
        ) : null}
      </dialog>
    </>
  );
}
