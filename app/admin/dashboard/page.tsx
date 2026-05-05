import { createClient } from "@/lib/supabase/server";
import AdminDashboardClient from "@/components/AdminDashboard";

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, group_name, role")
    .order("full_name");

  const { data: cotisations } = await supabase
    .from("cotisations")
    .select("*")
    .order("year", { ascending: true })
    .order("month", { ascending: true });

  return (
    <AdminDashboardClient
      profiles={profiles || []}
      cotisations={cotisations || []}
    />
  );
}
