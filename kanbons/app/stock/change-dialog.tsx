"use client";

import { useEffect, useRef, useState } from "react";
import { cachedProductOptions, type ChoiceOption } from "@/app/ui/choice";
import type { StockListRow } from "@/lib/models/stock";
import { changeStockAction } from "./actions";

export function ChangeStockDialog({ rows }: { rows: StockListRow[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [products, setProducts] = useState<ChoiceOption[]>([]);
  const [productId, setProductId] = useState("");
  const current = rows.find((row) => String(row.product_id) === productId);

  function open() {
    dialog.current?.showModal();
    void cachedProductOptions().then(setProducts);
  }

  useEffect(() => {
    return () => setProducts([]);
  }, []);

  return (
    <>
      <button type="button" className="btn-primary" onClick={open}>
        Change stock
      </button>
      <dialog ref={dialog} className="box">
        <h2 className="text-lg font-semibold">Change stock</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Set the book quantity or a full warehouse recount. Leave a field blank
          to keep what is already saved.
        </p>
        <form
          className="dialog-fields"
          action={async (formData) => {
            dialog.current?.close();
            await changeStockAction(formData);
            setProductId("");
          }}
        >
          <label>
            <span>Product</span>
            <select
              name="product_id"
              required
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
            >
              <option value="">Pick a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Book qty</span>
            <input
              name="quantity"
              defaultValue={current?.quantity == null ? "" : String(current.quantity)}
              key={`qty-${productId}`}
            />
          </label>
          <label>
            <span>Warehouse count</span>
            <input
              name="contador_physical"
              defaultValue={
                current?.contador_physical == null
                  ? ""
                  : String(current.contador_physical)
              }
              key={`wh-${productId}`}
            />
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
              Save stock
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
