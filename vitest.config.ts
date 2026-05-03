import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const serverOnlyMock = path.resolve(__dirname, "./__mocks__/server-only.js");
const nextCacheMock = path.resolve(__dirname, "./__mocks__/next/cache.js");

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          setupFiles: ["./tests/setup.ts"],
        },
      },
      {
        extends: true,
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./src"),
            "server-only": serverOnlyMock,
            "next/cache": nextCacheMock,
          },
        },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["./tests/setup-integration.ts"],
          fileParallelism: false,
          pool: "forks",
        },
      },
    ],
  },
});
