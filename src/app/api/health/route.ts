import { NextResponse } from "next/server";
import { runFoundationCheck } from "@/lib/foundation-check";

export const dynamic = "force-dynamic";

// GET /api/health -> JSON version of the foundation check, for uptime
// monitors and for a quick curl after deploying to Vercel.
export async function GET() {
  const report = await runFoundationCheck();
  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
