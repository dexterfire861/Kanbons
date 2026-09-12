"use client";

import { useEffect, useState } from "react";
import type { ShipmentLine } from "@/lib/models/shipment_lines";
import { SHIPMENT_UNIT_TYPES } from "@/lib/models/shipment_unit_types";
import { AutosaveRow, Cell, CellSelect, useAutosave } from "@/app/ui/autosave-row";
import { cachedProductOptions, Choice } from "@/app/ui/choice";
import {
  createShipmentLineAction,
  updateShipmentLineAction,
} from "./actions";

function str(value: string | number | null | undefined) {
  return value == null ? "" : String(value);
}

function productLabel(line: ShipmentLine) {
  if (line.sku && line.product) return `${line.sku} — ${line.product}`;
  return line.product ?? line.sku ?? null;
}

type Fields = {
  product_id: string;
  yards_pcs: string;
  unit: string;
  type_of_unit: string;
};

function fieldsOf(line: ShipmentLine): Fields {
  return {
    product_id: str(line.product_id),
    yards_pcs: str(line.yards_pcs),
    unit: str(line.unit),
    type_of_unit: str(line.type_of_unit),
  };
}

const empty: Fields = {
  product_id: "",
  yards_pcs: "",
  unit: "",
  type_of_unit: "",
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
          value={values.yards_pcs}
          onChange={(value) => setField("yards_pcs", value)}
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
        <CellSelect
          value={values.type_of_unit}
          onChange={(value) => setField("type_of_unit", value)}
          onSave={save}
        >
          <option value="">None</option>
          {SHIPMENT_UNIT_TYPES.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </CellSelect>
      </td>
    </>
  );
}

function ExistingRow({
  line,
  shipmentId,
}: {
  line: ShipmentLine;
  shipmentId: number;
}) {
  const { values, setField, save, state, error } = useAutosave({
    initial: fieldsOf(line),
    extra: { id: String(line.id), shipment_id: String(shipmentId) },
    required: ["product_id"],
    action: updateShipmentLineAction,
  });
  return (
    <AutosaveRow state={state} error={error} onSave={save}>
      <LineFields
        values={values}
        setField={setField}
        save={save}
        label={productLabel(line)}
      />
    </AutosaveRow>
  );
}

function NewRow({
  shipmentId,
  onCreated,
}: {
  shipmentId: number;
  onCreated: (line: ShipmentLine) => void;
}) {
  const { values, setField, save, state, error } = useAutosave({
    initial: empty,
    extra: { shipment_id: String(shipmentId) },
    required: ["product_id"],
    action: createShipmentLineAction,
    onSaved: (result) => onCreated(result as ShipmentLine),
  });
  return (
    <AutosaveRow state={state} error={error} onSave={save}>
      <LineFields values={values} setField={setField} save={save} />
    </AutosaveRow>
  );
}

export function ShipmentLineSheet({
  shipmentId,
  lines: initial,
}: {
  shipmentId: number;
  lines: ShipmentLine[];
}) {
  const [lines, setLines] = useState(initial);
  const [draft, setDraft] = useState(0);
  useEffect(() => {
    setLines(initial);
  }, [initial]);

  return (
    <div className="sheet">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Yards / pieces</th>
            <th>Units</th>
            <th>Type of unit</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <NewRow
            key={draft}
            shipmentId={shipmentId}
            onCreated={(line) => {
              setLines((current) => [line, ...current]);
              setDraft((key) => key + 1);
            }}
          />
          {lines.map((line) => (
            <ExistingRow key={line.id} line={line} shipmentId={shipmentId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
