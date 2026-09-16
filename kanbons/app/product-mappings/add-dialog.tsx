"use client";

import { useRef, useState } from "react";
import { cachedProductOptions, Choice } from "@/app/ui/choice";
import { createProductMappingAction } from "./actions";

export function MappingAddDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [productId, setProductId] = useState("");

  return (
    <>
      <button
        type="button"
        className="btn-primary"
        onClick={() => dialog.current?.showModal()}
      >
        Add name match
      </button>
      <dialog ref={dialog} className="box">
        <h2 className="text-lg font-semibold">New name match</h2>
        <p className="mt-1 text-sm text-zinc-600">
          The name a customer writes, matched to our product.
        </p>
        <form
          className="dialog-fields"
          action={async (formData) => {
            dialog.current?.close();
            await createProductMappingAction(formData);
            setProductId("");
          }}
        >
          <label>
            <span>Customer name</span>
            <input name="client_name" required />
          </label>
          <label>
            <span>Kanbons name</span>
            <input name="kanbons_name" />
          </label>
          <label>
            <span>Item code</span>
            <input name="item_code" />
          </label>
          <label>
            <span>Product</span>
            <input type="hidden" name="product_id" value={productId} />
            <Choice
              value={productId ? Number(productId) : null}
              emptyLabel="None"
              loadOptions={cachedProductOptions}
              onChange={(id) => setProductId(id == null ? "" : String(id))}
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
              Save name match
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
