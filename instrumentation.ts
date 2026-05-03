// Next.js 15 instrumentation hook — runs once per server boot.
// Used for the boot guard: refuses to start with unsafe env combos.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runBootGuard } = await import("@/server/boot-guard");
    runBootGuard();
  }
}
