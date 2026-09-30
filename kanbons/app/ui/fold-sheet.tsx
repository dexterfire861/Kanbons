"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const VISIBLE_ROWS = 8;

export function FoldSheet({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [extra, setExtra] = useState(0);

  useEffect(() => {
    const rows = ref.current?.querySelectorAll("tbody tr");
    if (!rows) return;
    const hidden = Math.max(0, rows.length - VISIBLE_ROWS);
    setExtra(hidden);
    rows.forEach((row, index) => {
      if (!open && index >= VISIBLE_ROWS) row.setAttribute("hidden", "");
      else row.removeAttribute("hidden");
    });
  }, [open, children]);

  return (
    <div className={className}>
      <div className="sheet" ref={ref}>
        {children}
      </div>
      {extra > 0 ? (
        <button
          type="button"
          className="fold-rest"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Show less ▲" : `Show the rest (${extra}) ▼`}
        </button>
      ) : null}
    </div>
  );
}
