import { createClient as createAnonClient } from "@supabase/supabase-js";
import { readPublicSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type CheckStatus = "ok" | "problem" | "skipped";

export type Check = {
  name: string;
  status: CheckStatus;
  detail: string;
};

export type FoundationReport = {
  ok: boolean;
  checkedAt: string;
  checks: Check[];
};

// Verifies the four things that must be true before Phase 1 work starts:
// keys are present, the database answers, migrations are applied, and RLS
// hides private data from anonymous reads. Runs with the caller's (anon) session.
export async function runFoundationCheck(): Promise<FoundationReport> {
  const checks: Check[] = [];
  const env = readPublicSupabaseEnv();

  if (!env) {
    checks.push({
      name: "Environment",
      status: "problem",
      detail: "Keys not found. Copy .env.example to .env.local and fill in the Supabase URL and publishable key.",
    });
    for (const name of ["Database", "Migrations", "Privacy"]) {
      checks.push({ name, status: "skipped", detail: "Waiting on environment." });
    }
    return { ok: false, checkedAt: new Date().toISOString(), checks };
  }

  checks.push({ name: "Environment", status: "ok", detail: `Keys loaded for ${new URL(env.url).host}.` });

  const supabase = createClient();

  // A query the migrations guarantee will answer: 0002 seeds one current waiver.
  const waiver = await supabase.from("waivers").select("version").eq("is_current", true).maybeSingle();

  if (waiver.error) {
    const missingTable = /schema cache|does not exist|relation/i.test(waiver.error.message);
    checks.push({
      name: "Database",
      status: missingTable ? "ok" : "problem",
      detail: missingTable ? "Connected." : `Could not reach the database: ${waiver.error.message}`,
    });
    checks.push({
      name: "Migrations",
      status: "problem",
      detail: missingTable
        ? "Not applied yet. Run supabase/migrations 0001 through 0004 in the SQL Editor, in order."
        : "Could not check until the database answers.",
    });
    checks.push({ name: "Privacy", status: "skipped", detail: "Waiting on migrations." });
    return { ok: false, checkedAt: new Date().toISOString(), checks };
  }

  checks.push({ name: "Database", status: "ok", detail: "Connected." });
  checks.push({
    name: "Migrations",
    status: waiver.data ? "ok" : "problem",
    detail: waiver.data
      ? `Applied. Current waiver version is ${waiver.data.version}.`
      : "Tables exist but no current waiver was found. Re-run 0002_classes_bookings.sql.",
  });

  // Probe as a genuinely anonymous visitor: a fresh client with no session, NOT
  // the caller's logged-in one. A chef viewing this page can legitimately see
  // their own address, so using their session here would raise a false alarm.
  // As anon, this table must return zero rows and no error — an error means
  // grants are off, rows mean RLS is off.
  const anon = createAnonClient(env.url, env.publishableKey, { auth: { persistSession: false } });
  const addresses = await anon.from("location_addresses").select("location_id", { head: true, count: "exact" });
  const leak = !addresses.error && (addresses.count ?? 0) > 0;
  checks.push({
    name: "Privacy",
    status: addresses.error || leak ? "problem" : "ok",
    detail: addresses.error
      ? `Anonymous read of location_addresses failed: ${addresses.error.message}`
      : leak
        ? "Exact addresses are readable without a booking. Re-run 0004_rls.sql."
        : "Exact addresses are hidden from anonymous reads.",
  });

  return { ok: checks.every((c) => c.status === "ok"), checkedAt: new Date().toISOString(), checks };
}
