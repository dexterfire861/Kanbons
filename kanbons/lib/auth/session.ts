import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getProfile } from "@/lib/models/profiles";
import type { AppRole } from "./permissions";

export type Person = {
  id: string;
  name: string;
  role: AppRole;
};

export async function currentPerson(): Promise<Person | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return getProfile(data.user.id);
}

export async function requirePerson(): Promise<Person> {
  const person = await currentPerson();
  if (!person) redirect("/sign-in");
  return person;
}
