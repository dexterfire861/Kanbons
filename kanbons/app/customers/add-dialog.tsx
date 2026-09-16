"use client";

import { useRef } from "react";
import type { Customer } from "@/lib/models/customers";
import { createCustomerAction } from "./actions";

export function CustomerAddDialog({
  onCreated,
}: {
  onCreated?: (row: Customer) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="btn-primary"
        onClick={() => dialog.current?.showModal()}
      >
        Add customer
      </button>
      <dialog ref={dialog} className="box">
        <h2 className="text-lg font-semibold">New customer</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Who we ship to. The system assigns an ID.
        </p>
        <form
          className="dialog-fields"
          action={async (formData) => {
            const row = await createCustomerAction(formData);
            onCreated?.(row);
            dialog.current?.close();
          }}
        >
          <label>
            <span>Name</span>
            <input name="name" required />
          </label>
          <label>
            <span>Customer code</span>
            <input name="id_cust" />
          </label>
          <label>
            <span>Address</span>
            <input name="address" />
          </label>
          <label>
            <span>City</span>
            <input name="city" />
          </label>
          <label>
            <span>State</span>
            <input name="state" />
          </label>
          <label>
            <span>ZIP</span>
            <input name="zip_code" />
          </label>
          <label>
            <span>Contact</span>
            <input name="point_of_contact" />
          </label>
          <label>
            <span>Email</span>
            <input name="email_contact" type="email" />
          </label>
          <div className="dialog-actions">
            <button type="button" className="border border-zinc-400 px-3 py-1 text-sm" onClick={() => dialog.current?.close()}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save customer
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
