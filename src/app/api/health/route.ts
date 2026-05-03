import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const startedAt = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      uptime: process.uptime(),
      latencyMs: Date.now() - startedAt,
      deployTarget: process.env.DEPLOY_TARGET ?? "unknown",
      authMode: process.env.AUTH_MODE ?? "unknown",
    });
  } catch (e) {
    return NextResponse.json(
      {
        status: "degraded",
        error: (e as Error).message,
        latencyMs: Date.now() - startedAt,
      },
      { status: 503 },
    );
  }
}
