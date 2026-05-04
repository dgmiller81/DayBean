import "server-only";
// S0-T09 — Typed runtime config. Reads env vars once at module load and
// validates with Zod. Anything not validated here should not be read from
// process.env directly elsewhere — add it here so we have one source of
// truth.

import { z } from "zod";
import { PrebrewPolicySchema, type PrebrewPolicy } from "@/types/refresh";

const ConfigSchema = z.object({
  /**
   * Stage of the dual-run cost-graduation roadmap. Default 'always' (Stage 0).
   * See docs/daybeans/06-implementation-plan.md §6.4 cost-graduation roadmap.
   * Flip this env var to 'tiered' / 'reactive' / 'smart-resume' as morning
   * success rate proves out — no code changes required.
   */
  PREBREW_POLICY: PrebrewPolicySchema.default("always"),
});

const raw = {
  PREBREW_POLICY: process.env.PREBREW_POLICY ?? undefined,
};

const result = ConfigSchema.safeParse(raw);
if (!result.success) {
  // Crash early — bad env at startup beats silent wrong behavior at request time.
  throw new Error(
    `[config] invalid env: ${result.error.issues
      .map((i) => `${i.path.join(".")} ${i.message}`)
      .join("; ")}`,
  );
}

export const config: { PREBREW_POLICY: PrebrewPolicy } = result.data;
