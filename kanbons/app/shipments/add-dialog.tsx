"use client";

import { useRef, useState } from "react";
import { SHIPMENT_UNIT_TYPES } from "@/lib/models/shipment_unit_types";
import { createShipmentAction } from "./actions";

type ProductOption = { id: number; num: string; product: string };

type Line = {
  product_id: string;
  yards_pcs: string;
  unit: string;
  type_of_unit: string;
};

const emptyLine = (): Line => ({
  product_id: "",
  yards_pcs: "",
  unit: "",
  type_of_unit: "",
});

export function ShipmentAddDialog({ products }: { products: ProductOption[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  function addLine() {
    setLines((current) => [...current, emptyLine()]);
  }

  return (
    <>
      <button
        type="button"
        className="border border-zinc-800 px-3 py-1 text-sm"
        onClick={() => dialog.current?.showModal()}
      >
        Add container
      </button>
      <dialog ref={dialog} className="box wide">
        <h2 className="text-lg font-semibold">New incoming container</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Header plus every product on the container, saved together.
        </p>
        <form
          className="dialog-fields"
          action={async (formData) => {
            const payload = lines.map((line) => ({
              product_id: line.product_id ? Number(line.product_id) : null,
              yards_pcs: line.yards_pcs ? Number(line.yards_pcs) : null,
              unit: line.unit ? Number(line.unit) : null,
              type_of_unit: line.type_of_unit || null,
            }));
            formData.set("lines", JSON.stringify(payload));
            await createShipmentAction(formData);
            setLines([emptyLine()]);
            dialog.current?.close();
          }}
        >
          <label>
            <span>Number</span>
            <input name="number" required />
          </label>
          <label>
            <span>Country</span>
            <input name="country" />
          </label>
          <label>
            <span>Invoice number</span>
            <input name="invoice_number" />
          </label>
          <label>
            <span>Arrival</span>
            <input name="arrival_date" type="date" />
          </label>
          <label>
            <span>Departure</span>
            <input name="departure_date" type="date" />
          </label>

          <p className="font-semibold text-sm">Products on this container</p>
          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <label>
                <span>Product</span>
                <select
                  value={line.product_id}
                  onChange={(event) => {
                    const value = event.target.value;
                    setLines((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, product_id: value } : item
                      )
                    );
                  }}
                >
                  <option value="">None</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.num} — {product.product}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Yards / pieces</span>
                <input
                  value={line.yards_pcs}
                  onChange={(event) => {
                    const value = event.target.value;
                    setLines((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, yards_pcs: value } : item
                      )
                    );
                  }}
                />
              </label>
              <label>
                <span>Units</span>
                <input
                  value={line.unit}
                  onChange={(event) => {
                    const value = event.target.value;
                    setLines((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, unit: value } : item
                      )
                    );
                  }}
                />
              </label>
              <label>
                <span>Type of unit</span>
                <select
                  value={line.type_of_unit}
                  onChange={(event) => {
                    const value = event.target.value;
                    setLines((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, type_of_unit: value } : item
                      )
                    );
                  }}
                >
                  <option value="">None</option>
                  {SHIPMENT_UNIT_TYPES.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
          <button type="button" className="border border-zinc-400 px-3 py-1 text-sm w-fit" onClick={addLine}>
            Add another product
          </button>

          <div className="dialog-actions">
            <button type="button" className="border border-zinc-400 px-3 py-1 text-sm" onClick={() => dialog.current?.close()}>
              Cancel
            </button>
            <button type="submit" className="border border-zinc-800 px-3 py-1 text-sm">
              Save container
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
