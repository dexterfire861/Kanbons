"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      className="border border-zinc-800 px-3 py-1 text-sm"
      onClick={() => window.print()}
    >
      Print 3 copies
    </button>
  );
}
