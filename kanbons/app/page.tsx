import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { count, error } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  if (error) {
    return <pre>{error.message}</pre>;
  }

  return <p>customers: {count}</p>;
}