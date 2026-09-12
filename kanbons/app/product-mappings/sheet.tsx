"use client";

import { useEffect, useState } from "react";
import type { ProductMapping } from "@/lib/models/product_mappings";
import { AutosaveRow, Cell, useAutosave } from "@/app/ui/autosave-row";
import { cachedProductOptions, Choice } from "@/app/ui/choice";
import {
  createProductMappingAction,
  updateProductMappingAction,
} from "./actions";

function str(value: string | number | null | undefined) {
  return value == null ? "" : String(value);
}

type Fields = {
  client_name: string;
  kanbons_name: string;
  item_code: string;
  product_id: string;
};

function fieldsOf(row: ProductMapping): Fields {
  return {
    client_name: row.client_name,
    kanbons_name: str(row.kanbons_name),
    item_code: str(row.item_code),
    product_id: str(row.product_id),
  };
}

const empty: Fields = {
  client_name: "",
  kanbons_name: "",
  item_code: "",
  product_id: "",
};

function MappingFields({
  values,
  setField,
  save,
  productLabel,
}: {
  values: Fields;
  setField: (name: keyof Fields, value: string) => void;
  save: () => void;
  productLabel?: string | null;
}) {
  const productId = values.product_id ? Number(values.product_id) : null;
  return (
    <>
      <td>
        <Cell
          required
          placeholder="Customer name"
          value={values.client_name}
          onChange={(value) => setField("client_name", value)}
          onSave={save}
        />
      </td>
      <td>
        <Cell
          placeholder="Kanbons name"
          value={values.kanbons_name}
          onChange={(value) => setField("kanbons_name", value)}
          onSave={save}
        />
      </td>
      <td>
        <Cell
          placeholder="Item code"
          value={values.item_code}
          onChange={(value) => setField("item_code", value)}
          onSave={save}
        />
      </td>
      <td>
        <Choice
          value={productId}
          label={productLabel}
          emptyLabel="None"
          loadOptions={cachedProductOptions}
          onChange={(id) => {
            setField("product_id", id == null ? "" : String(id));
            void save();
          }}
        />
      </td>
    </>
  );
}

function ExistingRow({
  row,
  productLabel,
}: {
  row: ProductMapping;
  productLabel?: string | null;
}) {
  const { values, setField, save, state } = useAutosave({
    initial: fieldsOf(row),
    extra: { id: String(row.id) },
    required: ["client_name"],
    action: updateProductMappingAction,
  });
  return (
    <AutosaveRow state={state} onSave={save}>
      <MappingFields
        values={values}
        setField={setField}
        save={save}
        productLabel={productLabel}
      />
    </AutosaveRow>
  );
}

function NewRow({
  onCreated,
}: {
  onCreated: (row: ProductMapping) => void;
}) {
  const { values, setField, save, state } = useAutosave({
    initial: empty,
    required: ["client_name"],
    action: createProductMappingAction,
    onSaved: (result) => onCreated(result as ProductMapping),
  });
  return (
    <AutosaveRow state={state} onSave={save}>
      <MappingFields values={values} setField={setField} save={save} />
    </AutosaveRow>
  );
}

export function ProductMappingSheet({
  rows: initial,
  productLabels,
}: {
  rows: ProductMapping[];
  productLabels: Record<number, string>;
}) {
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
            <th>Customer name</th>
            <th>Kanbons name</th>
            <th>Item code</th>
            <th>Product</th>
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
            <ExistingRow
              key={row.id}
              row={row}
              productLabel={
                row.product_id == null ? null : productLabels[row.product_id]
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
