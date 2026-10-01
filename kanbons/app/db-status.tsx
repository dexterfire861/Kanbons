import type { ReactNode } from "react";
import { currentPerson } from "@/lib/auth/session";
import { pingDatabase } from "@/lib/models/health";

export async function DbStatus({ children }: { children: ReactNode }) {
  const { ok } = await pingDatabase();
  if (ok) return children;
  const person = await currentPerson();
  if (!person) return children;
  return (
    <main className="p-6">
      <p>
        Database is not answering.
      </p>
    </main>
  );
}
