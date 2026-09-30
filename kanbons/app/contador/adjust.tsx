"use client";

import { useRef } from "react";
import { adjustWarehouseCountAction } from "@/app/stock/actions";
import type { ContadorRow } from "@/lib/models/contador";

function fmt(value: number | null | undefined) {
  if (value == null) return "—";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function AdjustCount({ row }: { row: ContadorRow }) {
  const dialog = useRef<HTMLDialogElement>(null);
  if (row.product_id == null) return null;

  return (
    <>
      <button
        type="button"
        className="underline"
        onClick={() => dialog.current?.showModal()}
      >
        Adjust count
      </button>
      <dialog ref={dialog} className="box">
        <h2 className="text-lg font-semibold">Adjust count</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {row.num} — {row.product}. This adds to the warehouse count on Stock.
        </p>
        <p className="mt-2 text-sm">
          Remaining {fmt(row.difference)} · Book qty {fmt(row.book_quantity)} ·
          Warehouse {fmt(row.warehouse)}
        </p>
        <form
          className="dialog-fields"
          action={async (formData) => {
            dialog.current?.close();
            await adjustWarehouseCountAction(formData);
          }}
        >
          <input type="hidden" name="product_id" value={row.product_id} />
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
      </dialog>
    </>
  );
}
