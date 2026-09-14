"use client";

import { useEffect, useState } from "react";
import type {
  PackingListLine,
  PackingListLineTotal,
} from "@/lib/models/packing_list_lines";
import { AutosaveRow, Cell, useAutosave } from "@/app/ui/autosave-row";
import { cachedProductOptions, Choice } from "@/app/ui/choice";
import {
  createPackingListLineAction,
  updatePackingListLineAction,
} from "./actions";

function str(value: string | number | null | undefined) {
  return value == null ? "" : String(value);
}

function money(yards: string, price: string) {
  const qty = Number(yards);
  const unit = Number(price);
  if (!Number.isFinite(qty) || !Number.isFinite(unit)) return "";
  return String(qty * unit);
}

type LineRow = {
  id: number | null;
  product_id: number | null;
  product: string | null;
  yards_pieces: number | null;
  unit: number | null;
  pre_uni: number | null;
  total: number | null;
};

function fromTotal(line: PackingListLineTotal): LineRow {
  return {
    id: line.id,
    product_id: line.product_id,
    product: line.product,
    yards_pieces: line.yards_pieces,
    unit: line.unit,
    pre_uni: line.pre_uni,
    total: line.total,
  };
}

function fromCreated(line: PackingListLine): LineRow {
  const total =
    line.yards_pieces != null && line.pre_uni != null
      ? line.yards_pieces * line.pre_uni
      : null;
  return {
    id: line.id,
    product_id: line.product_id,
    product: line.product,
    yards_pieces: line.yards_pieces,
    unit: line.unit,
    pre_uni: line.pre_uni,
    total,
  };
}

type Fields = {
  product_id: string;
  yards_pieces: string;
  unit: string;
  pre_uni: string;
};

function fieldsOf(line: LineRow): Fields {
  return {
    product_id: str(line.product_id),
    yards_pieces: str(line.yards_pieces),
    unit: str(line.unit),
    pre_uni: str(line.pre_uni),
  };
}

const empty: Fields = {
  product_id: "",
  yards_pieces: "",
  unit: "",
  pre_uni: "",
};

function LineFields({
  values,
  setField,
  save,
  label,
}: {
  values: Fields;
  setField: (name: keyof Fields, value: string) => void;
  save: () => void;
  label?: string | null;
}) {
  const productId = values.product_id ? Number(values.product_id) : null;
  return (
    <>
      <td>
        <Choice
          value={productId}
          label={label}
          emptyLabel="Product"
          loadOptions={cachedProductOptions}
          onChange={(id) => {
            setField("product_id", id == null ? "" : String(id));
            void save();
          }}
        />
      </td>
      <td>
        <Cell
          placeholder="Yards / pieces"
          value={values.yards_pieces}
          onChange={(value) => setField("yards_pieces", value)}
          onSave={save}
        />
      </td>
      <td>
        <Cell
          placeholder="Units"
          value={values.unit}
          onChange={(value) => setField("unit", value)}
          onSave={save}
        />
      </td>
      <td>
        <Cell
          placeholder="Price"
          value={values.pre_uni}
          onChange={(value) => setField("pre_uni", value)}
          onSave={save}
        />
      </td>
      <td className="num">{money(values.yards_pieces, values.pre_uni)}</td>
    </>
  );
}

function ExistingRow({
  line,
  packingListId,
}: {
  line: LineRow;
  packingListId: number;
}) {
  const { values, setField, save, state, error } = useAutosave({
    initial: fieldsOf(line),
    extra: { id: str(line.id), packing_list_id: String(packingListId) },
    required: ["product_id"],
    action: updatePackingListLineAction,
  });
  return (
    <AutosaveRow state={state} error={error} onSave={save}>
      <LineFields
        values={values}
        setField={setField}
        save={save}
        label={line.product}
      />
    </AutosaveRow>
  );
}

function NewRow({
  packingListId,
  onCreated,
}: {
  packingListId: number;
  onCreated: (line: LineRow) => void;
}) {
  const { values, setField, save, state, error } = useAutosave({
    initial: empty,
    extra: { packing_list_id: String(packingListId) },
    required: ["product_id"],
    action: createPackingListLineAction,
    onSaved: (result) => onCreated(fromCreated(result as PackingListLine)),
  });
  return (
    <AutosaveRow state={state} error={error} onSave={save}>
      <LineFields values={values} setField={setField} save={save} />
    </AutosaveRow>
  );
}

export function PackingListLineSheet({
  packingListId,
  lines: initial,
}: {
  packingListId: number;
  lines: PackingListLineTotal[];
}) {
  const [lines, setLines] = useState(initial.map(fromTotal));
  const [draft, setDraft] = useState(0);
  useEffect(() => {
    setLines(initial.map(fromTotal));
  }, [initial]);

  return (
    <div className="sheet">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Yards / pieces</th>
            <th>Units</th>
            <th>Price</th>
            <th>Total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <NewRow
            key={draft}
            packingListId={packingListId}
            onCreated={(line) => {
              setLines((current) => [line, ...current]);
              setDraft((key) => key + 1);
            }}
          />
          {lines.map((line) => (
            <ExistingRow
              key={line.id}
              line={line}
              packingListId={packingListId}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
