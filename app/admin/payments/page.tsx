import { createClient } from "@/lib/supabase/server";
import PaymentsEditor from "@/components/PaymentsEditor";

export default async function PaymentsPage() {
  const supabase = createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, group_name")
    .order("full_name");

  const { data: cotisations } = await supabase
    .from("cotisations")
    .select("*")
    .order("year", { ascending: true })
    .order("month", { ascending: true });

  return <PaymentsEditor profiles={profiles || []} cotisations={cotisations || []} />;
}
