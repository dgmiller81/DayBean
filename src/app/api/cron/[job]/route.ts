// S0-T06 — Cron dispatch endpoint. External schedulers (Railway, pg_cron,
// GitHub Actions) hit /api/cron/<job-name> with X-Cron-Secret header. The
// endpoint validates the secret and routes into the in-process registry.
//
// Stubs for morning-brew and evening-prebrew return ok:true with processed:0.
// Real logic lands in S2-T04 / S2-T05.

import { NextResponse } from "next/server";
import { isJobName, runJob } from "@/server/cron/scheduler";

const SECRET_HEADER = "x-cron-secret";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ job: string }> },
) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }
  const provided = req.headers.get(SECRET_HEADER);
  if (provided !== expected) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }
  const { job } = await params;
  if (!isJobName(job)) {
    return NextResponse.json(
      { ok: false, error: `unknown job '${job}'` },
      { status: 404 },
    );
  }
  const result = await runJob(job);
  return NextResponse.json({ ok: result.ok, ranJob: job, result });
}

// Allow GET as well for ease of manual testing in dev (with secret).
export const GET = POST;
