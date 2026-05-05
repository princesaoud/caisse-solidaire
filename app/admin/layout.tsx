import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
  if (!profile || profile.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav profile={profile} />
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
