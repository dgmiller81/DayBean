// Tiny relative-time helper — extracted from RefreshStatus.tsx in S4-T04
// so the JournalThemesTab can share the exact same phrasing
// ("just now", "5 minutes ago", "yesterday", "3 days ago").
//
// Accepts a Date or an ISO string. Returns a short human phrase relative
// to *now*. Past-only — future dates collapse to "just now".

export function formatRelative(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60_000) return "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
