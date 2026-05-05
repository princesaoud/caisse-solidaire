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

      if (authError) {
        if (authError.message.includes("already been registered")) {
          skipped++;
          results.push(`SKIP: ${member.username} (already exists)`);
          continue;
        }
        errors++;
        results.push(`ERROR: ${member.username} - ${authError.message}`);
        continue;
      }

      const userId = authData.user!.id;

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
