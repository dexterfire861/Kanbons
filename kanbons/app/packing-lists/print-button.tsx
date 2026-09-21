"use client";

export function PrintButton({ label = "Print 3 copies" }: { label?: string }) {
  return (
    <button
      type="button"
      className="border border-zinc-800 px-3 py-1 text-sm"
      onClick={() => window.print()}
    >
      {label}
    </button>
  );
}
