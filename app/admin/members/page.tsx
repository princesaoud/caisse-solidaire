import { createClient } from "@/lib/supabase/server";
import MembersManager from "@/components/MembersManager";

export default async function MembersPage() {
  const supabase = createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");
  return <MembersManager profiles={profiles || []} />;
}
