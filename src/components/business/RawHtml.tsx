import type { CSSProperties } from "react";

/**
 * SECURITY: trust boundary.
 *
 * Renders a pre-trusted HTML string from `getDailyContent`. The source is
 * either (a) the local fixture in `src/lib/daily-content-fixture.ts` (this
 * codebase) or (b) the per-user `DailyContent` DB table (Phase 6+), where
 * every row is authored by the signed-in user (Phase 7) or written by the
 * Phase 8 LLM pipeline that runs server-side under the user's own account.
 *
 * No untrusted source feeds this component today. Phase 14 hardening will
 * wrap the body in DOMPurify before any external/user-from-internet content
 * is permitted. Centralising the unsafe call here makes that swap a
 * one-file change.
 *
 * DO NOT pass any value here that originates from an unauthenticated user,
 * URL parameter, request body, or third-party API without first changing
 * this implementation to sanitise.
 */
export function RawHtml({
  html,
  style,
  className,
}: {
  html: string;
  style?: CSSProperties;
  className?: string;
}) {
  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}
