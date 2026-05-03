import type { DailyContent } from "@/types/daily-content";

/**
 * Normalize a URL for dedupe comparison. We strip trailing slashes, the
 * fragment, and a small set of known-noisy tracking params (utm_*, ref,
 * fbclid, gclid, mc_cid, mc_eid). Hostname is lowercased and "www." is
 * stripped. Keeps the rest of the path/query so distinct articles on the
 * same host aren't collapsed.
 */
const STRIP_PARAM_PREFIXES = ["utm_"];
const STRIP_PARAMS = new Set(["ref", "fbclid", "gclid", "mc_cid", "mc_eid"]);

export function normalizeUrlForDedupe(raw: string): string {
  try {
    const u = new URL(raw);
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    u.hash = "";
    const next = new URLSearchParams();
    for (const [k, v] of u.searchParams) {
      if (STRIP_PARAMS.has(k)) continue;
      if (STRIP_PARAM_PREFIXES.some((p) => k.startsWith(p))) continue;
      next.append(k, v);
    }
    u.search = next.toString() ? `?${next.toString()}` : "";
    let s = u.toString();
    if (s.endsWith("/") && u.pathname !== "/") s = s.slice(0, -1);
    return s;
  } catch {
    return raw.trim();
  }
}

/**
 * Remove URL duplicates across sections of a DailyContent payload. Keeps
 * the URL in the highest-priority section it appears in; drops it from
 * lower-priority sections. Order, highest first:
 *
 *   1. business.topStories
 *   2. mindfulness.articles
 *   3. business.articles
 *   4. personal.articles
 *   5. business.scan
 *   6. business.quotes (only when the quote has a url)
 *
 * After dedupe, sections "move up" naturally because we filter rather
 * than splice — the array compacts in place.
 */
export function dedupeContent(content: DailyContent): DailyContent {
  const seen = new Set<string>();
  const keep = (url: string | undefined | null): boolean => {
    if (!url) return true;
    const key = normalizeUrlForDedupe(url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };

  const topStories = content.business.topStories.filter((s) => keep(s.url));
  const mindfulnessArticles = content.mindfulness.articles.filter((a) => keep(a.url));
  const businessArticles = content.business.articles.filter((a) => keep(a.url));
  const personalArticles = content.personal.articles.filter((a) => keep(a.url));
  const scan = content.business.scan.filter((s) => keep(s.url));
  const quotes = content.business.quotes.filter((q) => (q.url ? keep(q.url) : true));

  return {
    ...content,
    mindfulness: { ...content.mindfulness, articles: mindfulnessArticles },
    business: {
      ...content.business,
      topStories,
      articles: businessArticles,
      scan,
      quotes,
    },
    personal: { ...content.personal, articles: personalArticles },
  };
}
