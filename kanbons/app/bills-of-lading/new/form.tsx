"use client";

import { useMemo, useState } from "react";
import type { BolPackingListChoice } from "@/lib/models/bills_of_lading";
import { createBillOfLadingAction } from "../actions";

export function BillOfLadingForm({
  lists,
  defaultDate,
}: {
  lists: BolPackingListChoice[];
  defaultDate: string;
}) {
  const [date, setDate] = useState(defaultDate);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [qty, setQty] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  const defaults = useMemo(() => {
    const next: Record<number, string> = {};
    for (const list of lists) {
      for (const line of list.lines) {
        next[line.id] = String(line.yardsPieces);
      }
    }
    return next;
  }, [lists]);

  function onContainer(lineId: number, yardsPieces: number): string {
    return qty[lineId] ?? defaults[lineId] ?? String(yardsPieces);
  }

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (lists.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No confirmed packing lists waiting. Confirm a packing list first.
      </p>
    );
  }

  return (
    <form
      className="max-w-3xl space-y-6"
      action={async (formData) => {
        setError("");
        const picks = lists
          .filter((list) => selected.has(list.id))
          .flatMap((list) =>
            list.lines.map((line) => ({
              packingListId: list.id,
              packingListLineId: line.id,
              onContainer: Number(onContainer(line.id, line.yardsPieces)),
            }))
          );
        formData.set("picks", JSON.stringify(picks));
        try {
          await createBillOfLadingAction(formData);
        } catch (caught) {
          setError(
            caught instanceof Error ? caught.message : "Could not save this bill of lading"
          );
        }
      }}
    >
      <div className="dialog-fields">
        <label>
          <span>Date</span>
          <input
            name="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
      </div>

      {lists.map((list) => {
        const open = selected.has(list.id);
        return (
          <fieldset key={list.id} className="border border-zinc-200 p-3">
            <legend className="px-1 text-sm font-semibold">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={open}
                  onChange={() => toggle(list.id)}
                />
                {list.label}
              </label>
            </legend>
            {open ? (
              <div className="sheet mt-2">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>On packing list</th>
                      <th>On this container</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.lines.map((line) => (
                      <tr key={line.id}>
                        <td>{line.product || "—"}</td>
                        <td className="num">{line.yardsPieces}</td>
                        <td>
                          <label className="dialog-fields !m-0">
                            <span className="sr-only">On this container</span>
                            <input
                              type="number"
                              min={0}
                              max={line.yardsPieces}
                              step="any"
                              aria-label={`On this container ${line.product || line.id}`}
                              value={onContainer(line.id, line.yardsPieces)}
                              onChange={(event) =>
                                setQty((current) => ({
                                  ...current,
                                  [line.id]: event.target.value,
                                }))
                              }
                            />
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </fieldset>
        );
      })}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        className="btn-primary"
        disabled={selected.size === 0}
      >
        Save bill of lading
      </button>
    </form>
  );
}
