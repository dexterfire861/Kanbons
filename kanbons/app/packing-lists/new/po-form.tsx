"use client";

import { useMemo, useState } from "react";
import {
  asWrittenOptions,
  packingSlipFromParts,
  type Address,
  type MatchMapping,
  type MatchProduct,
} from "@/lib/models/packing_slip_match";
import { SlipView } from "../slip-view";
import { createAndConfirmFromPoAction } from "../workflow-actions";

type CustomerOption = {
  id: number;
  name: string;
  id_cust: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
};

type Line = {
  asWritten: string;
  itemCode: string;
  yardsPieces: string;
  unit: string;
};

const emptyLine = (): Line => ({
  asWritten: "",
  itemCode: "",
  yardsPieces: "",
  unit: "",
});

const emptyAddress = (): Address => ({
  name: "",
  address: "",
  city: "",
  state: "",
  zip: "",
});

function fromCustomer(customer: CustomerOption | undefined): Address {
  if (!customer) return emptyAddress();
  return {
    name: customer.name,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    zip: customer.zip_code,
  };
}

function AddressFields({
  prefix,
  title,
  values,
  onChange,
}: {
  prefix: string;
  title: string;
  values: Address;
  onChange: (next: Address) => void;
}) {
  function set(key: keyof Address, value: string) {
    onChange({ ...values, [key]: value || null });
  }
  return (
    <fieldset className="dialog-fields border border-zinc-200 p-3">
      <legend className="font-semibold text-sm px-1">{title}</legend>
      <label>
        <span>Name</span>
        <input
          name={`${prefix}_name`}
          value={values.name ?? ""}
          onChange={(event) => set("name", event.target.value)}
        />
      </label>
      <label>
        <span>Address</span>
        <input
          name={`${prefix}_address`}
          value={values.address ?? ""}
          onChange={(event) => set("address", event.target.value)}
        />
      </label>
      <label>
        <span>City</span>
        <input
          name={`${prefix}_city`}
          value={values.city ?? ""}
          onChange={(event) => set("city", event.target.value)}
        />
      </label>
      <label>
        <span>State</span>
        <input
          name={`${prefix}_state`}
          value={values.state ?? ""}
          onChange={(event) => set("state", event.target.value)}
        />
      </label>
      <label>
        <span>ZIP</span>
        <input
          name={`${prefix}_zip`}
          value={values.zip ?? ""}
          onChange={(event) => set("zip", event.target.value)}
        />
      </label>
    </fieldset>
  );
}

export function PurchaseOrderForm({
  customers,
  products,
  mappings,
  nextNumber,
}: {
  customers: CustomerOption[];
  products: MatchProduct[];
  mappings: MatchMapping[];
  nextNumber: number;
}) {
  const [customerId, setCustomerId] = useState("");
  const [customerPo, setCustomerPo] = useState("");
  const [date, setDate] = useState("");
  const [shipDate, setShipDate] = useState("");
  const [shipTo, setShipTo] = useState<Address>(emptyAddress());
  const [billTo, setBillTo] = useState<Address>(emptyAddress());
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const names = useMemo(() => asWrittenOptions(mappings), [mappings]);
  const customer = useMemo(
    () => customers.find((item) => String(item.id) === customerId),
    [customers, customerId]
  );

  const preview = useMemo(
    () =>
      packingSlipFromParts({
        numPl: nextNumber,
        customerId: customer?.id ?? 0,
        customerName: customer?.name ?? "",
        customerCode: customer?.id_cust ?? null,
        customerPo,
        date: date || null,
        shipDate: shipDate || null,
        shipTo,
        billTo,
        lines: lines.map((line) => ({
          asWritten: line.asWritten,
          itemCode: line.itemCode || null,
          yardsPieces: line.yardsPieces ? Number(line.yardsPieces) : null,
          unit: line.unit ? Number(line.unit) : null,
          productId: null,
        })),
        products,
        mappings,
      }),
    [
      billTo,
      customer,
      customerPo,
      date,
      lines,
      mappings,
      nextNumber,
      products,
      shipDate,
      shipTo,
    ]
  );

  function setLine(index: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  return (
    <form
      className="grid gap-6 xl:grid-cols-2"
      action={async (formData) => {
        const filled = lines.filter((line) => line.asWritten || line.unit);
        formData.set(
          "lines",
          JSON.stringify(
            filled.map((line, index) => ({
              asWritten: line.asWritten,
              itemCode: line.itemCode || null,
              yardsPieces: line.yardsPieces ? Number(line.yardsPieces) : null,
              unit: line.unit ? Number(line.unit) : null,
              productId: null,
            }))
          )
        );
        await createAndConfirmFromPoAction(formData);
      }}
    >
      <div className="space-y-4">
        <div className="dialog-fields">
          <label>
            <span>Customer</span>
            <select
              name="customer_id"
              required
              value={customerId}
              onChange={(event) => {
                const value = event.target.value;
                setCustomerId(value);
                const next = customers.find((item) => String(item.id) === value);
                const address = fromCustomer(next);
                setShipTo(address);
                setBillTo(address);
              }}
            >
              <option value="">Select customer</option>
              {customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Purchase order number</span>
            <input
              name="customer_po"
              required
              value={customerPo}
              onChange={(event) => setCustomerPo(event.target.value)}
            />
          </label>
          <label>
            <span>Date</span>
            <input
              name="date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label>
            <span>Ship date</span>
            <input
              name="ship_date"
              type="date"
              value={shipDate}
              onChange={(event) => setShipDate(event.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <AddressFields prefix="ship_to" title="Ship to" values={shipTo} onChange={setShipTo} />
          <AddressFields prefix="bill_to" title="Bill to" values={billTo} onChange={setBillTo} />
        </div>

        <p className="font-semibold text-sm">Products on the purchase order</p>
        {lines.map((line, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-2">
              <label className="dialog-fields !m-0">
                <span>As written on PO</span>
                {names.length > 0 ? (
                  <select
                    value={line.asWritten}
                    onChange={(event) =>
                      setLine(index, { asWritten: event.target.value })
                    }
                  >
                    <option value="">Select name on PO</option>
                    {names.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={line.asWritten}
                    onChange={(event) =>
                      setLine(index, { asWritten: event.target.value })
                    }
                  />
                )}
              </label>
              <label className="dialog-fields !m-0">
                <span>Item code</span>
                <input
                  value={line.itemCode}
                  onChange={(event) =>
                    setLine(index, { itemCode: event.target.value })
                  }
                />
              </label>
              <label className="dialog-fields !m-0">
                <span>Yards / pieces</span>
                <input
                  value={line.yardsPieces}
                  onChange={(event) => setLine(index, { yardsPieces: event.target.value })}
                />
              </label>
              <label className="dialog-fields !m-0">
                <span>Units</span>
                <input
                  value={line.unit}
                  onChange={(event) => setLine(index, { unit: event.target.value })}
                />
              </label>
            </div>
        ))}
        {preview.lines.some((line) => !line.matched) ? (
          <p className="text-sm text-zinc-600">
            No name match for:{" "}
            {preview.lines
              .filter((line) => !line.matched)
              .map((line) => line.asWritten || "blank")
              .join(", ")}
            . Add it on Name matches or change As written.
          </p>
        ) : null}
        <button
          type="button"
          className="border border-zinc-400 px-3 py-1 text-sm"
          onClick={() => setLines((current) => [...current, emptyLine()])}
        >
          Add another line
        </button>
        <div>
          <button
            type="submit"
            className="border border-zinc-800 px-3 py-1 text-sm disabled:opacity-50"
            disabled={
              preview.lines.length === 0 ||
              preview.lines.some((line) => !line.matched)
            }
          >
            Confirm packing slip
          </button>
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">How it will look</p>
        <SlipView slip={preview} />
      </div>
    </form>
  );
}
