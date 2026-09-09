"use client";

import { useState } from "react";

export type ChoiceOption = { id: number; label: string };

export function Choice({
  form,
  name,
  options,
  value,
  emptyLabel = "None",
  required = false,
}: {
  form?: string;
  name: string;
  options: ChoiceOption[];
  value?: number | null;
  emptyLabel?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState(value == null ? "" : String(value));
  const selected = options.find((option) => String(option.id) === id);

  return (
    <>
      <input type="hidden" form={form} name={name} value={id} />
      {open ? (
        <select
          value={id}
          required={required}
          autoFocus
          onChange={(event) => {
            setId(event.target.value);
            setOpen(false);
          }}
          onBlur={() => setOpen(false)}
        >
          <option value="">{emptyLabel}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <button type="button" className="choice" onClick={() => setOpen(true)}>
          {selected?.label || emptyLabel}
        </button>
      )}
    </>
  );
}
