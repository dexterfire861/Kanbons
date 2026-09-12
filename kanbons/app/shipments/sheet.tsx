"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Shipment } from "@/lib/models/shipments";
import { AutosaveRow, Cell, useAutosave } from "@/app/ui/autosave-row";
import { updateShipmentAction } from "./actions";

function str(value: string | number | null | undefined) {
  return value == null ? "" : String(value);
}

function fieldsOf(row: Shipment) {
  return {
    number: str(row.number),
    country: str(row.country),
    invoice_number: str(row.invoice_number),
    arrival_date: str(row.arrival_date),
    departure_date: str(row.departure_date),
  };
}

function Row({ row }: { row: Shipment }) {
  const { values, setField, save, state } = useAutosave({
    initial: fieldsOf(row),
    extra: { id: String(row.id) },
    required: ["number"],
    action: updateShipmentAction,
  });

  return (
    <AutosaveRow state={state} onSave={save}>
      <td>
        <Cell required value={values.number} onChange={(value) => setField("number", value)} onSave={save} />
      </td>
      <td>
        <Cell value={values.country} onChange={(value) => setField("country", value)} onSave={save} />
      </td>
      <td>
        <Cell value={values.invoice_number} onChange={(value) => setField("invoice_number", value)} onSave={save} />
      </td>
      <td>
        <Cell type="date" value={values.arrival_date} onChange={(value) => setField("arrival_date", value)} onSave={save} />
      </td>
      <td>
        <Cell type="date" value={values.departure_date} onChange={(value) => setField("departure_date", value)} onSave={save} />
      </td>
      <td>
        <Link href={`/shipments/${row.id}`} className="underline">
          Lines
        </Link>
      </td>
    </AutosaveRow>
  );
}

export function ShipmentSheet({ rows: initial }: { rows: Shipment[] }) {
  const [rows, setRows] = useState(initial);
  useEffect(() => {
    setRows(initial);
  }, [initial]);

  return (
    <div className="sheet">
      <table>
        <thead>
          <tr>
            <th>Number</th>
            <th>Country</th>
            <th>Invoice number</th>
            <th>Arrival</th>
            <th>Departure</th>
            <th>Lines</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
