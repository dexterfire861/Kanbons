"use client";

import { useEffect, useState } from "react";
import type { StockListRow } from "@/lib/models/stock";
import { AutosaveRow, Cell, useAutosave } from "@/app/ui/autosave-row";
import { updateStockAction } from "./actions";

function str(value: string | number | null | undefined) {
  return value == null ? "" : String(value);
}

function Row({ row }: { row: StockListRow }) {
  const { values, setField, save, state, error } = useAutosave({
    initial: {
      quantity: str(row.quantity),
      contador_physical: str(row.contador_physical),
    },
    extra: { product_id: String(row.product_id) },
    action: updateStockAction,
  });
  const counted = row.contador_counted_at
    ? row.contador_counted_at.replace("T", " ").slice(0, 16)
    : "";

  return (
    <AutosaveRow state={state} error={error} onSave={save}>
      <td className="num">{row.num}</td>
      <td>{row.product}</td>
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

export function StockSheet({ rows: initial }: { rows: StockListRow[] }) {
  const [rows, setRows] = useState(initial);
  useEffect(() => {
    setRows(initial);
  }, [initial]);

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
          {rows.map((row) => (
            <Row key={row.product_id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
