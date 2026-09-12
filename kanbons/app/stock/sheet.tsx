"use client";

import { useEffect, useState } from "react";
import type { Stock } from "@/lib/models/stock";
import { AutosaveRow, Cell, useAutosave } from "@/app/ui/autosave-row";
import { cachedProductOptions, Choice } from "@/app/ui/choice";
import { createStockAction, updateStockAction } from "./actions";

function str(value: string | number | null | undefined) {
  return value == null ? "" : String(value);
}

type ProductLabel = { num: string; product: string };

function ExistingRow({
  row,
  product,
}: {
  row: Stock;
  product?: ProductLabel;
}) {
  const { values, setField, save, state } = useAutosave({
    initial: {
      quantity: str(row.quantity),
      contador_physical: str(row.contador_physical),
    },
    extra: { product_id: String(row.product_id) },
    action: updateStockAction,
  });
  const counted = row.contador_counted_at
    ? new Date(row.contador_counted_at).toLocaleString()
    : "";

  return (
    <AutosaveRow state={state} onSave={save}>
      <td className="num">{product?.num ?? row.product_id}</td>
      <td>{product?.product ?? ""}</td>
      <td>
        <Cell value={values.quantity} onChange={(value) => setField("quantity", value)} onSave={save} />
      </td>
      <td>
        <Cell
          value={values.contador_physical}
          onChange={(value) => setField("contador_physical", value)}
          onSave={save}
        />
      </td>
      <td className="num text-zinc-600">{counted}</td>
    </AutosaveRow>
  );
}

function NewRow({
  used,
  onCreated,
}: {
  used: Set<number>;
  onCreated: (row: Stock) => void;
}) {
  const { values, setField, save, state } = useAutosave({
    initial: { product_id: "", quantity: "", contador_physical: "" },
    required: ["product_id"],
    action: createStockAction,
    onSaved: (result) => onCreated(result as Stock),
  });
  const productId = values.product_id ? Number(values.product_id) : null;

  return (
    <AutosaveRow state={state} onSave={save}>
      <td colSpan={2}>
        <Choice
          value={productId}
          emptyLabel="Product"
          loadOptions={async () => {
            const options = await cachedProductOptions();
            return options.filter((option) => !used.has(option.id));
          }}
          onChange={(id) => {
            setField("product_id", id == null ? "" : String(id));
            void save();
          }}
        />
      </td>
      <td>
        <Cell
          placeholder="Book qty"
          value={values.quantity}
          onChange={(value) => setField("quantity", value)}
          onSave={save}
        />
      </td>
      <td>
        <Cell
          placeholder="Warehouse count"
          value={values.contador_physical}
          onChange={(value) => setField("contador_physical", value)}
          onSave={save}
        />
      </td>
      <td />
    </AutosaveRow>
  );
}

export function StockSheet({
  rows: initial,
  products,
}: {
  rows: Stock[];
  products: Record<number, ProductLabel>;
}) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState(0);
  useEffect(() => {
    setRows(initial);
  }, [initial]);
  const used = new Set(rows.map((row) => row.product_id));

  return (
    <div className="sheet">
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th>Book qty</th>
            <th>Warehouse count</th>
            <th>Counted at</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <NewRow
            key={draft}
            used={used}
            onCreated={(row) => {
              setRows((current) => [row, ...current]);
              setDraft((key) => key + 1);
            }}
          />
          {rows.map((row) => (
            <ExistingRow
              key={row.product_id}
              row={row}
              product={products[row.product_id]}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
