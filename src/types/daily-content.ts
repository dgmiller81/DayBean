import { z } from "zod";

// Notes on what this schema does NOT use, and why:
//
//  1. z.string().url() — OpenAI's structured outputs API rejects JSON Schema's
//     `format: 'uri'` keyword. URL well-formedness is validated at render-time
//     (anchor href fallback) instead.
//
//  2. .optional() — OpenAI's structured outputs strict mode requires every
//     property listed in `properties` to also appear in `required`. Optional
//     fields are rejected. To express "the LLM can skip this slot" we use
//     .nullable() instead — the LLM returns null when the value isn't useful.
//     Read paths normalize null → "" or [] for legacy consumers.
//
//  3. .default(...) — same reason as .optional(). Defaults imply the field
//     can be missing in input, which OpenAI rejects. We post-process the
//     parsed result if we need to map null → empty string / array.
const Url = z.string();

export const ArticleSchema = z.object({
  title: z.string(),
  source: z.string(),
  url: Url,
  summary: z.string(),
});

export const TopStorySchema = z.object({
  // "lead" | "" — empty string means a non-lead story. nullable so OpenAI
  // strict mode sees a required field. Read paths treat null as "".
  kind: z.enum(["lead", ""]).nullable(),
  eyebrow: z.string(),
  badges: z.array(z.object({ className: z.string(), label: z.string() })),
  title: z.string(),
  body: z.string(),
  url: Url,
  src: z.string(),
});

export const ScanItemSchema = z.object({
  title: z.string(),
  url: Url,
  src: z.string().nullable(),
});

export const QuoteSchema = z.object({
  text: z.string(),
  source: z.string(),
  target: z.string().nullable(),
  url: Url.nullable(),
});

export const RepoSchema = z.object({
  name: z.string(),
  org: z.string(),
  stars: z.string(),
  weekly: z.string(),
  license: z.string(),
  lang: z.string(),
  pitch: z.string(),
  url: Url,
});

export const DailyContentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  subhead: z.string(),
  god: z.object({
    opening: z.string(),
    prayer: z.string(),
    carry: z.string(),
  }),
  mindfulness: z.object({
    articles: z.array(ArticleSchema),
  }),
  business: z.object({
    headline: z.string(),
    briefing: z.string(),
    topStories: z.array(TopStorySchema),
    scan: z.array(ScanItemSchema),
    articles: z.array(z.object({
      badges: z.array(z.object({ className: z.string(), label: z.string() })),
      title: z.string(),
      summary: z.string(),
      url: Url,
      src: z.string(),
    })),
    quotes: z.array(QuoteSchema),
    repos: z.array(RepoSchema),
    watchlist: z.array(z.string()),
  }),
  personal: z.object({
    headline: z.string(),
    motivation: z.object({
      text: z.string(),
      author: z.string(),
    }),
    articles: z.array(ArticleSchema),
  }),
});

export type DailyContent = z.infer<typeof DailyContentSchema>;
export type Article = z.infer<typeof ArticleSchema>;
export type ScanItem = z.infer<typeof ScanItemSchema>;
