"use client";

import {
  useRef,
  useState,
  type FocusEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

function snapshot(values: Record<string, string>): string {
  return JSON.stringify(values);
}

export function useAutosave<T extends Record<string, string>>(opts: {
  initial: T;
  extra?: Record<string, string>;
  required?: (keyof T)[];
  action: (formData: FormData) => Promise<unknown>;
  onSaved?: (result: unknown, values: T) => void;
}) {
  const [values, setValues] = useState(opts.initial);
  const valuesRef = useRef(opts.initial);
  const saved = useRef(snapshot(opts.initial));
  const [state, setState] = useState<SaveState>("idle");

  function setField(name: keyof T, value: string) {
    const next = { ...valuesRef.current, [name]: value };
    valuesRef.current = next;
    setValues(next);
  }

  async function save() {
    const current = valuesRef.current;
    if (snapshot(current) === saved.current) return;
    if (opts.required?.some((key) => !String(current[key] ?? "").trim())) {
      return;
    }
    setState("saving");
    const formData = new FormData();
    for (const [key, value] of Object.entries(opts.extra ?? {})) {
      formData.set(key, value);
    }
    for (const [key, value] of Object.entries(current)) {
      formData.set(key, value);
    }
    try {
      const result = await opts.action(formData);
      saved.current = snapshot(current);
      setState("saved");
      opts.onSaved?.(result, current);
    } catch {
      setState("error");
    }
  }

  return { values, setField, save, state };
}

export function AutosaveRow({
  state,
  onSave,
  children,
}: {
  state: SaveState;
  onSave: () => void;
  children: ReactNode;
}) {
  function handleBlur(event: FocusEvent<HTMLTableRowElement>) {
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    onSave();
  }

  return (
    <tr onBlur={handleBlur}>
      {children}
      <td className="row-status">
        {state === "saving"
          ? "Saving"
          : state === "saved"
            ? "Saved"
            : state === "error"
              ? "Couldn't save"
              : ""}
      </td>
    </tr>
  );
}

type CellProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "onBlur"
> & {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
};

export function Cell({ value, onChange, onSave, ...rest }: CellProps) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => void onSave()}
    />
  );
}

type CellSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange" | "onBlur"
> & {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  children: ReactNode;
};

export function CellSelect({
  value,
  onChange,
  onSave,
  children,
  ...rest
}: CellSelectProps) {
  return (
    <select
      {...rest}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
        void onSave();
      }}
    >
      {children}
    </select>
  );
}
