import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // ESLint intentionally skipped during build — `next lint` is deprecated
  // and the flat-config + typescript-eslint setup is queued for Phase 14
  // (hardening). Typecheck (`tsc --noEmit`) runs in CI and catches type
  // and parse errors.
  eslint: { ignoreDuringBuilds: true },
};

export default config;
