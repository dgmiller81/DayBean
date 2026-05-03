import type { DailyContent } from "@/types/daily-content";
import { todayISO } from "@/lib/dates";

export function fixtureFor(iso: string): DailyContent {
  return {
    date: iso,
    subhead: "A fresh page.",
    god: {
      opening:
        "The morning belongs to no one yet. Take a slow breath and let your shoulders drop. The day will arrive — meet it on your own terms.",
      prayer:
        "Father, settle me. Quiet the noise that wants to fill this hour. Make me steady, generous, and a little braver than yesterday. Whatever I face today, let me carry your peace into it.",
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
            "Stillness is not the absence of motion; it is the presence of attention. A quiet meditation on what we lose when we are always busy.",
        },
      ],
    },
    business: {
      headline: "Today's edge: ship the smallest version of the thing.",
      briefing:
        "<strong>Smallest viable cut</strong> beats a beautiful plan you don't ship. Pick one user, one path, one screen. Move it.",
      topStories: [],
      scan: [],
      articles: [],
      quotes: [],
      repos: [],
      watchlist: [],
    },
    personal: {
      headline: "Move your body before you check your phone.",
      motivation: {
        text: "We do not rise to the level of our goals; we fall to the level of our systems.",
        author: "James Clear",
      },
      articles: [],
    },
  };
}

export const TODAY_FIXTURE: DailyContent = fixtureFor(todayISO());
