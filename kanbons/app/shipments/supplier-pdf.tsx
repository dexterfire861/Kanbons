"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readSupplierPdfAction } from "./actions";

export function SupplierPdfForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  return (
    <form
      className="dialog-fields mb-6 max-w-xl"
      action={async (formData) => {
        setBusy(true);
        setError("");
        try {
          await readSupplierPdfAction(formData);
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not read this supplier document."
          );
        } finally {
          setBusy(false);
          router.refresh();
        }
      }}
    >
      <label>
        <span>Supplier PDF</span>
        <input
          type="file"
          name="pdf"
          accept="application/pdf"
          disabled={busy}
          onChange={(event) => {
            if (event.target.files?.[0]) event.currentTarget.form?.requestSubmit();
          }}
        />
      </label>
      {busy ? <p className="text-sm text-zinc-600">Reading the supplier document…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
