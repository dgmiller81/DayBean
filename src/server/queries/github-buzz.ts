import "server-only";

export type GitHubRepo = {
  name: string;
  org: string;
  description: string;
  stars: number;
  starsDisplay: string;       // "12.3K"
  language: string | null;
  license: string | null;
  url: string;
  starsPerWeek: number | null; // only for fastest-growing
  starsPerWeekDisplay: string | null; // "+1.2K/wk"
};

export type GitHubBuzz = {
  topStarred: GitHubRepo[];
  fastestGrowing: GitHubRepo[];
  fetchedAt: string;
  error: string | null;
};

// Once-a-day cache. One unauthenticated request to GitHub per query per
// 24h is well below the 60/hr unauthenticated cap, so no token needed.
const CACHE_SECONDS = 86_400;
const FASTEST_GROWING_DAYS = 180;

type GhItem = {
  name: string;
  owner: { login: string };
  stargazers_count: number;
  description: string | null;
  language: string | null;
  license: { spdx_id?: string | null } | null;
  html_url: string;
  created_at: string;
};

function fmtStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

function fmtWeekly(starsPerWeek: number): string {
  if (starsPerWeek >= 1000) return `+${(starsPerWeek / 1000).toFixed(1)}K/wk`;
  if (starsPerWeek >= 10) return `+${Math.round(starsPerWeek)}/wk`;
  return `+${starsPerWeek.toFixed(1)}/wk`;
}

function parseItem(it: GhItem, withVelocity = false): GitHubRepo {
  let starsPerWeek: number | null = null;
  if (withVelocity) {
    const created = new Date(it.created_at).getTime();
    const ageMs = Date.now() - created;
    const weeks = Math.max(1, ageMs / (1000 * 60 * 60 * 24 * 7));
    starsPerWeek = it.stargazers_count / weeks;
  }
  return {
    name: it.name,
    org: it.owner.login,
    description: it.description ?? "",
    stars: it.stargazers_count,
    starsDisplay: fmtStars(it.stargazers_count),
    language: it.language,
    license: it.license?.spdx_id ?? null,
    url: it.html_url,
    starsPerWeek,
    starsPerWeekDisplay: starsPerWeek !== null ? fmtWeekly(starsPerWeek) : null,
  };
}

async function search(query: string, withVelocity: boolean): Promise<GitHubRepo[]> {
  const url =
    "https://api.github.com/search/repositories?q=" +
    encodeURIComponent(query) +
    "&sort=stars&order=desc&per_page=4";

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "DayBeans/1.0",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, {
    headers,
    next: { revalidate: CACHE_SECONDS },
  });

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as { items?: GhItem[] };
  return (data.items ?? []).map((it) => parseItem(it, withVelocity));
}

/**
 * Daily-cached GitHub Search:
 *   topStarred:     repos with "AI" in name/desc/readme + 1000+ stars,
 *                   sorted by stars desc, top 4.
 *   fastestGrowing: same keyword + created in the last 180 days,
 *                   sorted by stars desc, top 4 (with stars-per-week chip).
 *
 * Why a plain keyword (not topic:): the GitHub Search API's logical OR
 * across qualifiers is unreliable — `topic:ai OR topic:llm` silently
 * returns zero items. A keyword search ("ai") covers repos with AI in
 * the name/description/readme regardless of whether they remembered to
 * tag a topic, which is most of them.
 */
export async function getGitHubBuzz(): Promise<GitHubBuzz> {
  const since = new Date();
  since.setDate(since.getDate() - FASTEST_GROWING_DAYS);
  const sinceIso = since.toISOString().slice(0, 10);

  try {
    const [topStarred, fastestGrowing] = await Promise.all([
      search(`ai stars:>1000`, false),
      search(`ai stars:>200 created:>${sinceIso}`, true),
    ]);
    return {
      topStarred,
      fastestGrowing,
      fetchedAt: new Date().toISOString(),
      error: null,
    };
  } catch (e) {
    return {
      topStarred: [],
      fastestGrowing: [],
      fetchedAt: new Date().toISOString(),
      error: (e as Error).message,
    };
  }
}
