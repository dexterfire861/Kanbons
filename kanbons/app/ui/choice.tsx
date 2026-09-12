"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadCustomerOptions,
  loadProductOptions,
} from "@/app/ui/catalog";

export type ChoiceOption = { id: number; label: string };

let productOptions: Promise<ChoiceOption[]> | null = null;
let customerOptions: Promise<ChoiceOption[]> | null = null;

export function cachedProductOptions() {
  if (!productOptions) productOptions = loadProductOptions();
  return productOptions;
}

export function cachedCustomerOptions() {
  if (!customerOptions) customerOptions = loadCustomerOptions();
  return customerOptions;
}

export function Choice({
  value,
  label,
  emptyLabel = "None",
  loadOptions,
  onChange,
}: {
  value?: number | null;
  label?: string | null;
  emptyLabel?: string;
  loadOptions: () => Promise<ChoiceOption[]>;
  onChange: (id: number | null, option: ChoiceOption | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ChoiceOption[] | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadOptions().then((rows) => {
      if (!cancelled) setOptions(rows);
    });
    function close(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => {
      cancelled = true;
      document.removeEventListener("mousedown", close);
    };
  }, [open, loadOptions]);

  const selected = options?.find((option) => option.id === value);
  const shown = selected?.label || label || emptyLabel;
  const filtered = (options ?? []).filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="picker" ref={box}>
      {open ? (
        <div className="picker-open">
          <input
            autoFocus
            value={query}
            placeholder="Type to find"
            onChange={(event) => setQuery(event.target.value)}
          />
          <ul>
            <li>
              <button
                type="button"
                onClick={() => {
                  onChange(null, null);
                  setOpen(false);
                  setQuery("");
                }}
              >
                {emptyLabel}
              </button>
            </li>
            {filtered.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.id, option);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button type="button" className="choice" onClick={() => setOpen(true)}>
          {shown}
        </button>
      )}
    </div>
  );
}
