import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/// <reference types="@vitest/browser/providers/playwright" />

export default defineConfig({
  plugins: [react()],
  test: {
    setupFiles: "./vitest.setup.ts",
    css: true,
    browser: {
      enabled: true,
      provider: "playwright",
      // https://vitest.dev/guide/browser/playwright
      instances: [{ browser: "chromium" }],
    },
  },
});
