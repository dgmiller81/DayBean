import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { cookies } from "next/headers";
import "@/styles/globals.css";
import { DrawerHost } from "@/components/drawer/DrawerHost";
import { getCurrentUserId } from "@/server/auth-context";
import { db } from "@/server/db";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DayBeans",
  description: "A daily snapshot for spiritual, professional, and personal growth.",
};

const VALID_THEMES = new Set([
  "light",
  "dark",
  "warm",
  "forest",
  "midnight",
  "black",
  "space",
  "ai",
  "snow",
  "sepia",
  "slate",
  "crimson",
  "aurora",
  "steel",
  "ember",
]);

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const raw = (await cookies()).get("mm_theme")?.value;
  const theme = raw && VALID_THEMES.has(raw) ? raw : "light";

  // Pull the user's background-image preferences so the bg layer can render
  // on first paint (no flash). If the lookup fails we fall back to no image
  // and the default theme bg, which is harmless.
  let bgImageUrl: string | null = null;
  let bgOverlay = 90;
  try {
    const userId = await getCurrentUserId();
    const pref = await db.pref.findUnique({
      where: { userId },
      select: { bgImageUrl: true, bgOverlay: true },
    });
    bgImageUrl = pref?.bgImageUrl ?? null;
    bgOverlay = pref?.bgOverlay ?? 90;
  } catch {
    /* unauthenticated layout / startup — leave defaults */
  }

  const overlayAlpha = Math.max(0, Math.min(1, bgOverlay / 100));
  const htmlStyle: React.CSSProperties & Record<string, string | number> = {
    "--bg-overlay-opacity": String(overlayAlpha),
  };
  if (bgImageUrl) {
    htmlStyle["--bg-image"] = `url("${bgImageUrl.replace(/"/g, '\\"')}")`;
  }

  return (
    <html
      lang="en"
      data-theme={theme}
      data-bg-image={bgImageUrl ? "1" : "0"}
      className={`${fraunces.variable} ${inter.variable}`}
      style={htmlStyle}
    >
      <body>
        <div className="bg-image-layer" aria-hidden />
        <div className="bg-overlay-layer" aria-hidden />
        {children}
        <DrawerHost />
      </body>
    </html>
  );
}
