import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

const alias = {
  // Keep the `@/*` alias working without vite-tsconfig-paths' project discovery,
  // which trips over Next's generated .next/types entries.
  "@": path.resolve(root, "src"),
  // See test/stubs/server-only.ts
  "server-only": path.resolve(root, "test/stubs/server-only.ts"),
};

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    projects: [
      {
        // Server-only code: `lib/auth/*`, route handlers and the proxy import
        // `server-only`/`next/server` and must not run inside jsdom.
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "node",
          globals: true,
          environment: "node",
          setupFiles: ["./test/setup.node.ts"],
          include: [
            "src/lib/auth/**/*.test.ts",
            "src/app/api/**/*.test.ts",
            "src/proxy.test.ts",
          ],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "jsdom",
          globals: true,
          environment: "jsdom",
          setupFiles: ["./test/setup.ts"],
          include: ["src/**/*.test.{ts,tsx}", "test/**/*.test.{ts,tsx}"],
          exclude: [
            "src/lib/auth/**",
            "src/app/api/**",
            "src/proxy.test.ts",
            "**/node_modules/**",
          ],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/types.ts",
        "src/components/ui/**", // generated shadcn primitives
        "src/app/**/layout.tsx",
        "src/app/**/page.tsx", // thin route wrappers around crm-pages/*
      ],
    },
  },
});
