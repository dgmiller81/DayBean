import type { DailyContent } from "@/types/daily-content";
import { todayISO } from "@/lib/dates";

/**
 * Starter content shown until the user's first successful LLM refresh
 * lands a real DailyContent row. Phrased like real content (not "configure
 * this card" tutorial copy) so the dashboard looks complete on first load.
 */
export function fixtureFor(iso: string): DailyContent {
  return {
    date: iso,
    subhead: "A fresh page.",
    god: {
      opening:
        "The morning belongs to no one yet. Take a slow breath and let your shoulders drop. The day will arrive on its own — meet it from a place that's already settled, not from one trying to catch up.",
      prayer:
        "Father, settle me. Quiet the noise that wants to fill this hour. Make me steady, generous, and a little braver than yesterday. Where I'm proud, humble me; where I'm anxious, anchor me; where I'm self-focused, turn my eyes outward. Whatever I face today, let me carry your peace into it.",
      carry: "I am held; I do not need to hold everything.",
    },
    mindfulness: {
      articles: [
        {
          title: "Why morning routines matter more than evening ones",
          source: "Psyche",
          url: "https://psyche.co/ideas/why-morning-routines-matter",
          summary:
            "A short, practical look at how the first 20 minutes of the day shape attention for the next twelve hours.",
        },
        {
          title: "On stillness",
          source: "The Marginalian",
          url: "https://www.themarginalian.org/on-stillness",
          summary:
            "Stillness is not the absence of motion; it is the presence of attention. A meditation on what we lose when we are always busy.",
        },
        {
          title: "The underrated power of a 10-minute morning sit",
          source: "Mindful.org",
          url: "https://www.mindful.org/",
          summary:
            "Why short, consistent practice beats marathon sessions — and a simple framework to keep returning.",
        },
      ],
    },
    business: {
      headline: "The fastest path is rarely a straight line.",
      briefing:
        "<strong>Today's edge:</strong> ship the smallest version of the thing. A beautiful plan you don't ship loses to an embarrassing prototype that's in front of a real user. Pick one user, one path, one screen. Move it forward.",
      topStories: [
        {
          kind: "lead",
          eyebrow: "Story of the day",
          badges: [{ className: "b-product", label: "Product" }, { className: "tag", label: "AI" }],
          title: "Open weights keep getting better, faster",
          body: "The gap between frontier closed models and the best open-weight releases has compressed again this quarter. The cost curve is the real story — what cost $50 of inference six months ago is now well under $10.",
          url: "https://huggingface.co/papers",
          src: "huggingface.co",
        },
        {
          kind: "",
          eyebrow: "Open-source story",
          badges: [{ className: "b-open", label: "Open" }, { className: "tag", label: "OSS" }],
          title: "Agent frameworks consolidate around a small core",
          body: "After a year of fragmentation, the open-source agent stack is settling on three or four primitives — tools, traces, evals, and a planning loop. Less framework, more library.",
          url: "https://github.com/trending",
          src: "github.com",
        },
        {
          kind: "",
          eyebrow: "Risk story",
          badges: [{ className: "b-security", label: "Security" }, { className: "tag", label: "Risk" }],
          title: "Supply-chain attacks on ML registries pick up",
          body: "Two npm-style attacks against PyPI ML packages this month. The blast radius is wider than typical webapp incidents because training pipelines run with broad credentials.",
          url: "https://thehackernews.com",
          src: "thehackernews.com",
        },
      ],
      scan: [
        { title: "Inference costs continue to compress month-over-month.", url: "https://news.ycombinator.com/", src: "ycombinator.com" },
        { title: "Agent stacks consolidate to a smaller set of primitives.", url: "https://github.com/topics/agents", src: "github.com" },
        { title: "Open-weight context windows hit 1M+ tokens broadly.", url: "https://huggingface.co/models", src: "huggingface.co" },
        { title: "Code-gen evals plateau on benchmark; gap shows up in long horizons.", url: "https://arxiv.org/list/cs.SE/recent", src: "arxiv.org" },
        { title: "Voice-to-voice latency drops below human-conversation threshold.", url: "https://www.theverge.com/ai-artificial-intelligence", src: "theverge.com" },
        { title: "More research labs publish negative results — a healthy sign.", url: "https://arxiv.org/list/cs.LG/recent", src: "arxiv.org" },
        { title: "Local-first inference becomes a credible default for product teams.", url: "https://ollama.com/", src: "ollama.com" },
        { title: "Provenance + watermarking standards inch forward at the W3C.", url: "https://www.w3.org/", src: "w3.org" },
      ],
      articles: [
        {
          badges: [{ className: "b-model", label: "Model" }],
          title: "What 'agentic coding' actually means in production",
          summary: "A grounded look at the gap between demo-day capability and shipping a feature with a long-running coding agent.",
          url: "https://www.anthropic.com/research",
          src: "anthropic.com",
        },
        {
          badges: [{ className: "b-research", label: "Research" }],
          title: "Long-context retrieval: when more tokens hurt",
          summary: "Counter-intuitive findings on the performance cliff that shows up at very long contexts, and what to do about it.",
          url: "https://openai.com/research",
          src: "openai.com",
        },
        {
          badges: [{ className: "b-product", label: "Tool" }],
          title: "Notes on building an evaluation harness you'll keep",
          summary: "Why most teams' eval setups rot inside a quarter, and the small disciplines that prevent it.",
          url: "https://cursor.com/blog",
          src: "cursor.com",
        },
        {
          badges: [{ className: "b-research", label: "Architecture" }],
          title: "Inference cost curves and the product implications",
          summary: "When unit economics shift this fast, what looked like a flagship feature becomes table stakes within a quarter.",
          url: "https://huggingface.co/papers",
          src: "huggingface.co",
        },
      ],
      quotes: [
        {
          text: "The best founders I know don't argue with the model — they iterate on the prompt the way I used to iterate on the schema.",
          source: "@swyx",
          target: "agentic coding",
          url: "https://twitter.com/swyx",
        },
        {
          text: "Evals are the new tests. Treat them like CI.",
          source: "@simonw",
          target: "evals",
          url: "https://simonwillison.net/",
        },
      ],
      repos: [
        {
          name: "DayBean",
          org: "dgmiller81",
          stars: "—",
          weekly: "—",
          license: "MIT",
          lang: "TypeScript",
          pitch: "The DayBeans morning dashboard. The repo you're looking at right now.",
          url: "https://github.com/dgmiller81/DayBean",
        },
      ],
      watchlist: [
        "Inference-cost trajectory through year-end.",
        "Voice-mode latency at scale.",
        "Open-weight model licensing trend.",
        "Agent-framework consolidation list.",
      ],
    },
    personal: {
      headline: "Move your body before you check your phone.",
      motivation: {
        text: "We do not rise to the level of our goals; we fall to the level of our systems.",
        author: "James Clear",
      },
      articles: [
        {
          title: "How to build a habit that survives a bad week",
          source: "James Clear",
          url: "https://jamesclear.com/habits",
          summary:
            "The 2-minute rule, habit stacking, and why 'never miss twice' is the secret to consistency that compounds.",
        },
        {
          title: "What we actually mean when we say 'work-life balance'",
          source: "Greater Good",
          url: "https://greatergood.berkeley.edu/article/item/the_real_reason_youre_not_thriving_at_work",
          summary:
            "Boundaries aren't walls — they're protocols. A practical lens for the kinds of evenings you want.",
        },
        {
          title: "Reading the second book on a topic you already know",
          source: "Farnam Street",
          url: "https://fs.blog/reading-better/",
          summary:
            "Why the second book on a subject is often where the real understanding lives. A short manifesto for re-reading.",
        },
      ],
    },
  };
}

export const TODAY_FIXTURE: DailyContent = fixtureFor(todayISO());
