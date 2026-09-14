"use client";

import { useEffect, useState } from "react";
import type { Customer } from "@/lib/models/customers";
import { AutosaveRow, Cell, useAutosave } from "@/app/ui/autosave-row";
import { updateCustomerAction } from "./actions";

function str(value: string | null | undefined) {
  return value ?? "";
}

function fieldsOf(row: Customer) {
  return {
    name: row.name,
    id_cust: str(row.id_cust),
    city: str(row.city),
    state: str(row.state),
    address: str(row.address),
    zip_code: str(row.zip_code),
    point_of_contact: str(row.point_of_contact),
    email_contact: str(row.email_contact),
  };
}

function Row({ row }: { row: Customer }) {
  const { values, setField, save, state, error } = useAutosave({
    initial: fieldsOf(row),
    extra: { id: String(row.id) },
    required: ["name"],
    action: updateCustomerAction,
  });

  return (
    <AutosaveRow state={state} error={error} onSave={save}>
      <td>
        <Cell required value={values.name} onChange={(value) => setField("name", value)} onSave={save} />
      </td>
      <td>
        <Cell value={values.id_cust} onChange={(value) => setField("id_cust", value)} onSave={save} />
      </td>
      <td>
        <Cell value={values.city} onChange={(value) => setField("city", value)} onSave={save} />
      </td>
      <td>
        <Cell value={values.state} onChange={(value) => setField("state", value)} onSave={save} />
      </td>
      <td>
        <Cell value={values.address} onChange={(value) => setField("address", value)} onSave={save} />
      </td>
      <td>
        <Cell value={values.zip_code} onChange={(value) => setField("zip_code", value)} onSave={save} />
      </td>
      <td>
        <Cell
          value={values.point_of_contact}
          onChange={(value) => setField("point_of_contact", value)}
          onSave={save}
        />
      </td>
      <td>
        <Cell
          value={values.email_contact}
          onChange={(value) => setField("email_contact", value)}
          onSave={save}
        />
      </td>
    </AutosaveRow>
  );
}

export function CustomerSheet({ rows: initial }: { rows: Customer[] }) {
  const [rows, setRows] = useState(initial);
  useEffect(() => {
    setRows(initial);
  }, [initial]);

  return (
    <div className="sheet">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Customer code</th>
            <th>City</th>
            <th>State</th>
            <th>Address</th>
            <th>ZIP</th>
            <th>Contact</th>
            <th>Email</th>
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
