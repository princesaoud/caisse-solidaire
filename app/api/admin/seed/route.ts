import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import seedData from "@/lib/seed_data.json";

const DEFAULT_PASSWORD = "Cotisation2025!";

export async function POST(req: NextRequest) {
  // Verify secret header to prevent accidental re-seeding
  const secret = req.headers.get("x-seed-secret");
  if (secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminClient();

  const results: string[] = [];
  let created = 0, skipped = 0, errors = 0;

  for (const member of seedData as MemberSeed[]) {
    try {
      const email = `${member.username}@caisse-onpoint.local`;

      // Create auth user
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
      });

      let userId: string;

      if (authError) {
        if (authError.message.includes("already been registered")) {
          // Auth user exists — look up their ID so we can still create the profile
          const { data: userList } = await adminClient.auth.admin.listUsers();
          const existing = userList?.users.find(u => u.email === email);
          if (!existing) {
            errors++;
            results.push(`ERROR: ${member.username} - could not find existing auth user`);
            continue;
          }
          userId = existing.id;
        } else {
          errors++;
          results.push(`ERROR: ${member.username} - ${authError.message}`);
          continue;
        }
      } else {
        userId = authData.user!.id;
      }

      // Check if profile already exists
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existingProfile) {
        skipped++;
        results.push(`SKIP: ${member.username} (profile already exists)`);
        continue;
      }

      // Create profile
      const { data: profile, error: profileError } = await adminClient.from("profiles").insert({
        user_id: userId,
        username: member.username,
        full_name: member.full_name,
        role: member.role,
        group_name: member.group,
        is_first_login: true,
      }).select().single();

      if (profileError) {
        errors++;
        results.push(`ERROR profile: ${member.username} - ${profileError.message}`);
        continue;
      }

      // Insert cotisations
      if (member.payments.length > 0) {
        const cots = member.payments.map((p) => ({
          profile_id: profile.id,
          year: p.year,
          month: p.month,
          status: p.status,
          amount: p.amount,
          comment: member.comment || null,
        }));

        // Insert in batches
        for (let i = 0; i < cots.length; i += 50) {
          const batch = cots.slice(i, i + 50);
          const { error: cotError } = await adminClient.from("cotisations").upsert(batch, {
            onConflict: "profile_id,year,month",
          });
          if (cotError) results.push(`WARN cotisations: ${member.username} - ${cotError.message}`);
        }
      }

      created++;
      results.push(`OK: ${member.username} (${member.payments.length} payments)`);
    } catch (e) {
      errors++;
      results.push(`EXCEPTION: ${member.username} - ${String(e)}`);
    }
  }

  return NextResponse.json({
    summary: { created, skipped, errors, total: seedData.length },
    results,
  });
}

type MemberSeed = {
  username: string;
  full_name: string;
  group: string;
  role: string;
  comment: string;
  payments: { year: number; month: number; status: string; amount: number | null }[];
};
