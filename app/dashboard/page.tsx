import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UserDashboard from "@/components/UserDashboard";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (profile.is_first_login) redirect("/change-password");
  if (profile.role === "admin") redirect("/admin/dashboard");

  const { data: cotisations } = await supabase
    .from("cotisations")
    .select("*")
    .eq("profile_id", profile.id)
    .order("year", { ascending: true })
    .order("month", { ascending: true });

  return <UserDashboard profile={profile} cotisations={cotisations || []} />;
}
