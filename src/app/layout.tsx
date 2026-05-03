import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { cookies } from "next/headers";
import "@/styles/globals.css";
import { DrawerHost } from "@/components/drawer/DrawerHost";

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
  title: "The Daily Mind",
  description: "A daily snapshot for spiritual, professional, and personal growth.",
};

const VALID_THEMES = new Set(["light", "dark", "warm", "forest", "midnight"]);

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const raw = (await cookies()).get("mm_theme")?.value;
  const theme = raw && VALID_THEMES.has(raw) ? raw : "light";
  return (
    <html lang="en" data-theme={theme} className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        {children}
        <DrawerHost />
      </body>
    </html>
  );
}
