"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/models/products";
import { AutosaveRow, Cell, useAutosave } from "@/app/ui/autosave-row";
import { createProductAction, updateProductAction } from "./actions";

function str(value: string | number | null | undefined) {
  return value == null ? "" : String(value);
}

function fieldsOf(row: Product) {
  return {
    num: row.num,
    product: row.product,
    unit_pack: str(row.unit_pack),
    type_of_unit: str(row.type_of_unit),
    type_of_unit_customer: str(row.type_of_unit_customer),
    unit_of_measurement: str(row.unit_of_measurement),
    pre_uni: str(row.pre_uni),
  };
}

const empty = {
  num: "",
  product: "",
  unit_pack: "",
  type_of_unit: "",
  type_of_unit_customer: "",
  unit_of_measurement: "",
  pre_uni: "",
};

function ProductFields({
  values,
  setField,
  save,
}: {
  values: ReturnType<typeof fieldsOf>;
  setField: (name: keyof ReturnType<typeof fieldsOf>, value: string) => void;
  save: () => void;
}) {
  return (
    <>
      <td>
        <Cell required placeholder="SKU" value={values.num} onChange={(value) => setField("num", value)} onSave={save} />
      </td>
      <td>
        <Cell required placeholder="Name" value={values.product} onChange={(value) => setField("product", value)} onSave={save} />
      </td>
      <td>
        <Cell placeholder="Pack" value={values.unit_pack} onChange={(value) => setField("unit_pack", value)} onSave={save} />
      </td>
      <td>
        <Cell placeholder="Unit type" value={values.type_of_unit} onChange={(value) => setField("type_of_unit", value)} onSave={save} />
      </td>
      <td>
        <Cell placeholder="Customer unit" value={values.type_of_unit_customer} onChange={(value) => setField("type_of_unit_customer", value)} onSave={save} />
      </td>
      <td>
        <Cell placeholder="Measurement" value={values.unit_of_measurement} onChange={(value) => setField("unit_of_measurement", value)} onSave={save} />
      </td>
      <td>
        <Cell placeholder="Price" value={values.pre_uni} onChange={(value) => setField("pre_uni", value)} onSave={save} />
      </td>
    </>
  );
}

function ExistingRow({ row }: { row: Product }) {
  const { values, setField, save, state } = useAutosave({
    initial: fieldsOf(row),
    extra: { id: String(row.id) },
    required: ["num", "product"],
    action: updateProductAction,
  });
  return (
    <AutosaveRow state={state} onSave={save}>
      <ProductFields values={values} setField={setField} save={save} />
    </AutosaveRow>
  );
}

function NewRow({ onCreated }: { onCreated: (row: Product) => void }) {
  const { values, setField, save, state } = useAutosave({
    initial: empty,
    required: ["num", "product"],
    action: createProductAction,
    onSaved: (result) => onCreated(result as Product),
  });
  return (
    <AutosaveRow state={state} onSave={save}>
      <ProductFields values={values} setField={setField} save={save} />
    </AutosaveRow>
  );
}

export function ProductSheet({ rows: initial }: { rows: Product[] }) {
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
            <th>SKU</th>
            <th>Name</th>
            <th>Pack size</th>
            <th>Unit type</th>
            <th>Customer unit</th>
            <th>Measurement</th>
            <th>Price</th>
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
