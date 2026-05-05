import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Verify caller is an admin
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: callerProfile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  if (!callerProfile || callerProfile.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { profileId } = await req.json();
  if (!profileId) return NextResponse.json({ error: "profileId requis" }, { status: 400 });

  // Get the target profile
  const { data: targetProfile } = await supabase.from("profiles").select("user_id").eq("id", profileId).single();
  if (!targetProfile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

  // Reset password using admin client
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(targetProfile.user_id, {
    password: "Cotisation2025!",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark as first login again
  await supabase.from("profiles").update({ is_first_login: true }).eq("id", profileId);

  return NextResponse.json({ success: true });
}
