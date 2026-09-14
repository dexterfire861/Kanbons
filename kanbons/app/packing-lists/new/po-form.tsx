"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  asWrittenOptions,
  catalogItemCode,
  isWoodhaven,
  packingSlipFromParts,
  resolveProductId,
  type Address,
  type MatchMapping,
  type MatchProduct,
} from "@/lib/models/packing_slip_match";
import { SlipView } from "../slip-view";
import {
  createAndConfirmFromPoAction,
  readPoPdfAction,
} from "../workflow-actions";
import type { ParsedPoDraft } from "@/lib/models/purchase_orders";
import type { PoCorrectionSnapshot } from "@/lib/models/po_ingest_runs";

type CustomerOption = {
  id: number;
  name: string;
  id_cust: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
};

type Line = {
  asWritten: string;
  itemCode: string;
  altCode: string;
  yardsPieces: string;
  unit: string;
  productId: number | null;
};

const emptyLine = (): Line => ({
  asWritten: "",
  itemCode: "",
  altCode: "",
  yardsPieces: "",
  unit: "",
  productId: null,
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

function sameText(
  left: string | null | undefined,
  right: string | null | undefined
): boolean {
  return (left ?? "").trim() === (right ?? "").trim();
}

function fillLine(
  line: Line,
  products: MatchProduct[],
  mappings: MatchMapping[],
  woodhaven = false
): Line {
  const asPo = {
    asWritten: line.asWritten,
    itemCode: line.itemCode || null,
    altCode: line.altCode || null,
    yardsPieces: line.yardsPieces ? Number(line.yardsPieces) : null,
    unit: line.unit ? Number(line.unit) : null,
    productId: null,
  };
  const productId = resolveProductId(asPo, products, mappings, woodhaven);
  return {
    ...line,
    productId,
    itemCode: catalogItemCode(
      { ...asPo, productId, itemCode: line.itemCode || null },
      products,
      mappings,
      woodhaven
    ),
  };
}

function FieldNote({ empty, changed }: { empty: boolean; changed: boolean }) {
  if (changed) return <span className="needs-you-note"> You changed this</span>;
  if (empty) return <span className="needs-you-note"> Needs you</span>;
  return null;
}

function AddressFields({
  prefix,
  title,
  values,
  onChange,
  markEmpty,
  snapshot,
}: {
  prefix: string;
  title: string;
  values: Address;
  onChange: (next: Address) => void;
  markEmpty?: boolean;
  snapshot?: Address | null;
}) {
  function set(key: keyof Address, value: string) {
    onChange({ ...values, [key]: value || null });
  }
  function mark(key: keyof Address) {
    const empty = Boolean(markEmpty && !values[key]);
    const changed = Boolean(snapshot && !sameText(values[key], snapshot[key]));
    if (empty || changed) return "needs-you";
    return undefined;
  }
  function note(key: keyof Address) {
    const empty = Boolean(markEmpty && !values[key]);
    const changed = Boolean(snapshot && !sameText(values[key], snapshot[key]));
    return <FieldNote empty={empty} changed={changed} />;
  }
  return (
    <fieldset className="dialog-fields border border-zinc-200 p-3">
      <legend className="font-semibold text-sm px-1">{title}</legend>
      <label className={mark("name")}>
        <span>
          Name
          {note("name")}
        </span>
        <input
          name={`${prefix}_name`}
          value={values.name ?? ""}
          onChange={(event) => set("name", event.target.value)}
        />
      </label>
      <label className={mark("address")}>
        <span>
          Address
          {note("address")}
        </span>
        <input
          name={`${prefix}_address`}
          value={values.address ?? ""}
          onChange={(event) => set("address", event.target.value)}
        />
      </label>
      <label className={mark("city")}>
        <span>
          City
          {note("city")}
        </span>
        <input
          name={`${prefix}_city`}
          value={values.city ?? ""}
          onChange={(event) => set("city", event.target.value)}
        />
      </label>
      <label className={mark("state")}>
        <span>
          State
          {note("state")}
        </span>
        <input
          name={`${prefix}_state`}
          value={values.state ?? ""}
          onChange={(event) => set("state", event.target.value)}
        />
      </label>
      <label className={mark("zip")}>
        <span>
          ZIP
          {note("zip")}
        </span>
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
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrRan, setOcrRan] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrIssues, setOcrIssues] = useState<string[]>([]);
  const [ocrMarkdown, setOcrMarkdown] = useState("");
  const [ocrSource, setOcrSource] = useState("");
  const [ingestRunId, setIngestRunId] = useState<number | null>(null);
  const [ocrSnapshot, setOcrSnapshot] = useState<PoCorrectionSnapshot | null>(
    null
  );
  const router = useRouter();

  const customer = useMemo(
    () => customers.find((item) => String(item.id) === customerId),
    [customers, customerId]
  );
  const woodhaven = isWoodhaven(customer?.company, customer?.name);
  const names = useMemo(
    () => asWrittenOptions(mappings, woodhaven),
    [mappings, woodhaven]
  );
  const catalogLines = useMemo(
    () => lines.map((line) => fillLine(line, products, mappings, woodhaven)),
    [lines, mappings, products, woodhaven]
  );
  const nameChoices = useMemo(() => {
    const extra = catalogLines.map((line) => line.asWritten).filter(Boolean);
    return [...new Set([...names, ...extra])];
  }, [catalogLines, names]);

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
        lines: catalogLines.map((line) => ({
          asWritten: line.asWritten,
          itemCode: line.itemCode || null,
          altCode: line.altCode || null,
          yardsPieces: line.yardsPieces ? Number(line.yardsPieces) : null,
          unit: line.unit ? Number(line.unit) : null,
          productId: line.productId,
        })),
        products,
        mappings,
        company: customer?.company ?? null,
      }),
    [
      billTo,
      catalogLines,
      customer,
      customerPo,
      date,
      mappings,
      nextNumber,
      products,
      shipDate,
      shipTo,
    ]
  );

  function setLine(index: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((item, i) => {
        if (i !== index) return item;
        return fillLine(
          {
            ...item,
            ...patch,
            productId: null,
          },
          products,
          mappings,
          woodhaven
        );
      })
    );
  }

  function applyParsed(parsed: ParsedPoDraft) {
    const nextCustomer =
      parsed.customerId != null &&
      customers.some((item) => item.id === parsed.customerId)
        ? String(parsed.customerId)
        : "";
    const nextPo = parsed.customerPo;
    const nextDate = parsed.date ?? "";
    const nextShipDate = parsed.shipDate ?? "";
    const nextShipTo: Address = {
      name: parsed.shipTo.name,
      address: parsed.shipTo.address,
      city: parsed.shipTo.city,
      state: parsed.shipTo.state,
      zip: parsed.shipTo.zip,
    };
    const nextCustomerRow = customers.find(
      (item) => String(item.id) === nextCustomer
    );
    const fromCustomerAddress = fromCustomer(nextCustomerRow);
    const nextBillTo = fromCustomerAddress.name
      ? fromCustomerAddress
      : nextShipTo;
    const nextWoodhaven = isWoodhaven(
      nextCustomerRow?.company,
      nextCustomerRow?.name
    );
    const nextLines =
      parsed.lines.length > 0
        ? parsed.lines.map((line) =>
            fillLine(
              {
                asWritten: line.asWritten,
                itemCode: line.itemCode,
                altCode: line.altCode ?? "",
                yardsPieces:
                  line.yardsPieces == null ? "" : String(line.yardsPieces),
                unit: "",
                productId: null,
              },
              products,
              mappings,
              nextWoodhaven
            )
          )
        : [emptyLine()];
    setCustomerId(nextCustomer);
    setCustomerPo(nextPo);
    setDate(nextDate);
    setShipDate(nextShipDate);
    setShipTo(nextShipTo);
    setBillTo(nextBillTo);
    setLines(nextLines);
    setOcrSnapshot({
      customerId: nextCustomer,
      customerPo: nextPo,
      date: nextDate,
      shipDate: nextShipDate,
      shipTo: nextShipTo,
      billTo: nextBillTo,
      lines: nextLines,
    });
    setOcrIssues(parsed.issues);
    setOcrMarkdown(parsed.ocrMarkdown ?? "");
    setOcrSource(parsed.sourceName ?? "");
    setIngestRunId(parsed.ingestRunId);
    setOcrRan(true);
  }

  async function readPdf(file: File) {
    setOcrBusy(true);
    setOcrError(null);
    const data = new FormData();
    data.set("pdf", file);
    try {
      applyParsed(await readPoPdfAction(data));
    } catch (error) {
      setIngestRunId(null);
      setOcrSnapshot(null);
      setOcrError(
        error instanceof Error
          ? error.message
          : "Could not read this purchase order. Type it below or try again."
      );
    } finally {
      setOcrBusy(false);
      router.refresh();
    }
  }

  function markClass(empty: boolean, changed: boolean) {
    if (!ocrRan) return undefined;
    return empty || changed ? "needs-you" : undefined;
  }

  return (
    <form
      className="grid gap-6 xl:grid-cols-2"
      action={async (formData) => {
        const filled = catalogLines.filter((line) => line.asWritten || line.unit);
        formData.set(
          "lines",
          JSON.stringify(
            filled.map((line) => ({
              asWritten: line.asWritten,
              itemCode: line.itemCode || null,
              altCode: line.altCode || null,
              yardsPieces: line.yardsPieces ? Number(line.yardsPieces) : null,
              unit: line.unit ? Number(line.unit) : null,
              productId: line.productId,
            }))
          )
        );
        formData.set("ocr_markdown", ocrMarkdown);
        formData.set("ocr_source", ocrSource);
        formData.set("ocr_issues", ocrIssues.join("\n"));
        if (ocrSnapshot) {
          formData.set("ocr_snapshot", JSON.stringify(ocrSnapshot));
        }
        if (ingestRunId != null) {
          formData.set("ingest_run_id", String(ingestRunId));
        }
        await createAndConfirmFromPoAction(formData);
      }}
    >
      <div className="space-y-4">
        <div className="dialog-fields">
          <label>
            <span>Purchase order PDF</span>
            <input
              type="file"
              accept="application/pdf"
              disabled={ocrBusy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readPdf(file);
              }}
            />
          </label>
          {ocrBusy ? (
            <p className="text-sm text-zinc-600">Reading the purchase order…</p>
          ) : null}
          {ocrError ? <p className="text-sm text-red-700">{ocrError}</p> : null}
          {ocrRan && ocrIssues.length > 0 ? (
            <p className="text-sm text-zinc-600">
              Needs you: {ocrIssues.join("; ")}
            </p>
          ) : null}
          <label
            className={markClass(
              !customerId,
              Boolean(ocrSnapshot && customerId !== ocrSnapshot.customerId)
            )}
          >
            <span>
              Customer
              <FieldNote
                empty={ocrRan && !customerId}
                changed={Boolean(
                  ocrSnapshot && customerId !== ocrSnapshot.customerId
                )}
              />
            </span>
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
                setLines((current) =>
                  current.map((line) =>
                    fillLine(
                      line,
                      products,
                      mappings,
                      isWoodhaven(next?.company, next?.name)
                    )
                  )
                );
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
          <label
            className={markClass(
              !customerPo,
              Boolean(ocrSnapshot && !sameText(customerPo, ocrSnapshot.customerPo))
            )}
          >
            <span>
              Purchase order number
              <FieldNote
                empty={ocrRan && !customerPo}
                changed={Boolean(
                  ocrSnapshot && !sameText(customerPo, ocrSnapshot.customerPo)
                )}
              />
            </span>
            <input
              name="customer_po"
              required
              value={customerPo}
              onChange={(event) => setCustomerPo(event.target.value)}
            />
          </label>
          <label
            className={markClass(
              !date,
              Boolean(ocrSnapshot && !sameText(date, ocrSnapshot.date))
            )}
          >
            <span>
              Date
              <FieldNote
                empty={ocrRan && !date}
                changed={Boolean(ocrSnapshot && !sameText(date, ocrSnapshot.date))}
              />
            </span>
            <input
              name="date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label
            className={markClass(
              false,
              Boolean(ocrSnapshot && !sameText(shipDate, ocrSnapshot.shipDate))
            )}
          >
            <span>
              Ship date
              <FieldNote
                empty={false}
                changed={Boolean(
                  ocrSnapshot && !sameText(shipDate, ocrSnapshot.shipDate)
                )}
              />
            </span>
            <input
              name="ship_date"
              type="date"
              value={shipDate}
              onChange={(event) => setShipDate(event.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <AddressFields
            prefix="ship_to"
            title="Ship to"
            values={shipTo}
            onChange={setShipTo}
            markEmpty={ocrRan}
            snapshot={ocrSnapshot?.shipTo}
          />
          <AddressFields
            prefix="bill_to"
            title="Bill to"
            values={billTo}
            onChange={setBillTo}
            markEmpty={ocrRan}
            snapshot={ocrSnapshot?.billTo}
          />
        </div>

        <p className="font-semibold text-sm">Products on the purchase order</p>
        {catalogLines.map((line, index) => {
          const snap = ocrSnapshot?.lines[index];
          const unmatched = Boolean(
            preview.lines[index] && !preview.lines[index].matched
          );
          const nameEmpty = ocrRan && (!line.asWritten || unmatched);
          const nameChanged = Boolean(
            snap && !sameText(line.asWritten, snap.asWritten)
          );
          const codeEmpty = ocrRan && !line.itemCode;
          const codeChanged = Boolean(
            snap && !sameText(line.itemCode, snap.itemCode)
          );
          const qtyEmpty = ocrRan && !line.yardsPieces;
          const qtyChanged = Boolean(
            snap && !sameText(line.yardsPieces, snap.yardsPieces)
          );
          const unitChanged = Boolean(snap && !sameText(line.unit, snap.unit));
          return (
            <div key={index} className="grid gap-2 md:grid-cols-2">
              <label
                className={`dialog-fields !m-0${nameEmpty || nameChanged ? " needs-you" : ""}`}
              >
                <span>
                  As written on PO
                  <FieldNote empty={nameEmpty} changed={nameChanged} />
                </span>
                {nameChoices.length > 0 ? (
                  <select
                    value={line.asWritten}
                    onChange={(event) =>
                      setLine(index, { asWritten: event.target.value })
                    }
                  >
                    <option value="">Select name on PO</option>
                    {nameChoices.map((name) => (
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
              <label
                className={`dialog-fields !m-0${codeEmpty || codeChanged ? " needs-you" : ""}`}
              >
                <span>
                  Item code
                  <FieldNote empty={codeEmpty} changed={codeChanged} />
                </span>
                <input
                  value={line.itemCode}
                  onChange={(event) =>
                    setLine(index, { itemCode: event.target.value })
                  }
                />
              </label>
              <label
                className={`dialog-fields !m-0${qtyEmpty || qtyChanged ? " needs-you" : ""}`}
              >
                <span>
                  Yards / pieces
                  <FieldNote empty={qtyEmpty} changed={qtyChanged} />
                </span>
                <input
                  value={line.yardsPieces}
                  onChange={(event) => setLine(index, { yardsPieces: event.target.value })}
                />
              </label>
              <label
                className={`dialog-fields !m-0${unitChanged ? " needs-you" : ""}`}
              >
                <span>
                  Units
                  <FieldNote empty={false} changed={unitChanged} />
                </span>
                <input
                  value={line.unit}
                  onChange={(event) => setLine(index, { unit: event.target.value })}
                />
              </label>
            </div>
          );
        })}
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
            className="btn-primary"
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
