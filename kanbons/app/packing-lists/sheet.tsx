"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PackingList } from "@/lib/models/packing_lists";
import { AutosaveRow, Cell, useAutosave } from "@/app/ui/autosave-row";
import { cachedCustomerOptions, Choice } from "@/app/ui/choice";
import {
  createPackingListAction,
  updatePackingListAction,
} from "./actions";

function str(value: string | number | null | undefined) {
  return value == null ? "" : String(value);
}

type Fields = {
  num_pl: string;
  customer_id: string;
  customer_po: string;
  date: string;
  ship_date: string;
  state: string;
};

function fieldsOf(row: PackingList): Fields {
  return {
    num_pl: str(row.num_pl),
    customer_id: str(row.customer_id),
    customer_po: str(row.customer_po),
    date: str(row.date),
    ship_date: str(row.ship_date),
    state: str(row.state),
  };
}

const empty: Fields = {
  num_pl: "",
  customer_id: "",
  customer_po: "",
  date: "",
  ship_date: "",
  state: "",
};

function ListFields({
  values,
  setField,
  save,
  customerLabel,
  assignNumber,
}: {
  values: Fields;
  setField: (name: keyof Fields, value: string) => void;
  save: () => void;
  customerLabel?: string | null;
  assignNumber?: boolean;
}) {
  const customerId = values.customer_id ? Number(values.customer_id) : null;
  return (
    <>
      <td>
        {assignNumber ? (
          <input disabled placeholder="Assigned on save" />
        ) : (
          <Cell
            required
            placeholder="Number"
            value={values.num_pl}
            onChange={(value) => setField("num_pl", value)}
            onSave={save}
          />
        )}
      </td>
      <td>
        <Choice
          value={customerId}
          label={customerLabel}
          emptyLabel="Customer"
          loadOptions={cachedCustomerOptions}
          onChange={(id) => {
            setField("customer_id", id == null ? "" : String(id));
            void save();
          }}
        />
      </td>
      <td>
        <Cell
          placeholder="PO"
          value={values.customer_po}
          onChange={(value) => setField("customer_po", value)}
          onSave={save}
        />
      </td>
      <td>
        <Cell type="date" value={values.date} onChange={(value) => setField("date", value)} onSave={save} />
      </td>
      <td>
        <Cell type="date" value={values.ship_date} onChange={(value) => setField("ship_date", value)} onSave={save} />
      </td>
      <td>
        <Cell
          placeholder="State"
          value={values.state}
          onChange={(value) => setField("state", value)}
          onSave={save}
        />
      </td>
    </>
  );
}

function ExistingRow({ row }: { row: PackingList }) {
  const { values, setField, save, state, error } = useAutosave({
    initial: fieldsOf(row),
    extra: { id: String(row.id) },
    required: ["num_pl"],
    action: updatePackingListAction,
  });
  return (
    <AutosaveRow state={state} error={error} onSave={save}>
      <ListFields
        values={values}
        setField={setField}
        save={save}
        customerLabel={row.customer}
      />
      <td className="capitalize">{row.status}</td>
      <td>
        <Link href={`/packing-lists/${row.id}`} className="underline">
          Lines
        </Link>
      </td>
    </AutosaveRow>
  );
}

function NewRow({ onCreated }: { onCreated: (row: PackingList) => void }) {
  const { values, setField, save, state, error } = useAutosave({
    initial: empty,
    action: createPackingListAction,
    onSaved: (result) => onCreated(result as PackingList),
  });
  return (
    <AutosaveRow state={state} error={error} onSave={save}>
      <ListFields
        values={values}
        setField={setField}
        save={save}
        assignNumber
      />
      <td className="text-zinc-400">Draft</td>
      <td />
    </AutosaveRow>
  );
}

export function PackingListSheet({ rows: initial }: { rows: PackingList[] }) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState(0);
  useEffect(() => {
    setRows(initial);
  }, [initial]);

  return (
    <div className="sheet">
      <table>
        <thead>
          <tr>
            <th>Number</th>
            <th>Customer</th>
            <th>PO</th>
            <th>Date</th>
            <th>Ship date</th>
            <th>State</th>
            <th>Status</th>
            <th>Lines</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <NewRow
            key={draft}
            onCreated={(row) => {
              setRows((current) => [row, ...current]);
              setDraft((key) => key + 1);
            }}
          />
          {rows.map((row) => (
            <ExistingRow key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
