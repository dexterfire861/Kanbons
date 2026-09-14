import type { ReactNode } from "react";
import { pingDatabase } from "@/lib/models/health";

export async function DbStatus({ children }: { children: ReactNode }) {
  const { ok } = await pingDatabase();
  if (ok) return children;
  return (
    <main className="p-6">
      <p>
        Database is not answering. Open Docker Desktop, then from the project
        folder run npx supabase start.
      </p>
    </main>
  );
}
