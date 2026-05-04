import { z } from "zod";

export const ArticleSchema = z.object({
  title: z.string(),
  source: z.string(),
  url: z.string().url(),
  summary: z.string(),
});

export const TopStorySchema = z.object({
  kind: z.enum(["lead", ""]).optional().default(""),
  eyebrow: z.string(),
  badges: z.array(z.object({ className: z.string(), label: z.string() })).default([]),
  title: z.string(),
  body: z.string(),
  url: z.string().url(),
  src: z.string(),
});

export const ScanItemSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  src: z.string().optional().default(""),
});

export const QuoteSchema = z.object({
  text: z.string(),
  source: z.string(),
  target: z.string().optional().default(""),
  url: z.string().url().optional(),
});

export const RepoSchema = z.object({
  name: z.string(),
  org: z.string(),
  stars: z.string(),
  weekly: z.string(),
  license: z.string(),
  lang: z.string(),
  pitch: z.string(),
  url: z.string().url(),
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
      badges: z.array(z.object({ className: z.string(), label: z.string() })).default([]),
      title: z.string(),
      summary: z.string(),
      url: z.string().url(),
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
