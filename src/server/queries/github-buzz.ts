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

// Topics broad enough to capture AI/ML/LLM repos. GitHub Search OR-joins
// these in the query string with "+OR+".
const AI_TOPICS = ["ai", "artificial-intelligence", "machine-learning", "llm", "deep-learning"];
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
    "User-Agent": "TheDailyMind/1.0",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, {
    headers,
    // Next.js fetch cache: re-fetch at most once per hour
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as { items?: GhItem[] };
  return (data.items ?? []).map((it) => parseItem(it, withVelocity));
}

export async function getGitHubBuzz(): Promise<GitHubBuzz> {
  const topicQuery = AI_TOPICS.map((t) => `topic:${t}`).join(" OR ");

  // For "fastest growing" we look at recently-created repos and sort by
  // total stars. A young repo with many stars is, by definition, growing
  // fast. The Search API doesn't expose stars-per-day directly so this
  // proxy is the cleanest available.
  const since = new Date();
  since.setDate(since.getDate() - FASTEST_GROWING_DAYS);
  const sinceIso = since.toISOString().slice(0, 10);
  const fastestQuery = `(${topicQuery}) created:>${sinceIso}`;

  try {
    const [topStarred, fastestGrowing] = await Promise.all([
      search(`(${topicQuery})`, false),
      search(fastestQuery, true),
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
