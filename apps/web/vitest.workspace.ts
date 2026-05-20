import react from "@vitejs/plugin-react";
import path from "path";

import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      // an example of file based convention,
      // you don't have to follow it
      include: ["./src/**/*.{test,spec}.ts"],
      name: "unit",
      environment: "node",
    },
  },
  {
    define: {
      "process.env": {},
    },
    resolve: {
      alias: {
        // Adjust the path as needed based on your project structure
        "next/link": path.resolve(__dirname, "src/mocks/link"),
      },
    },
    plugins: [react()],
    test: {
      // an example of file based convention,
      // you don't have to follow it
      include: ["./src/**/*.{test,spec}.tsx"],
      setupFiles: "./vitest.setup.tsx",
      name: "browser",
      browser: {
        enabled: true,
        provider: "playwright",
        instances: [{ browser: "chromium" }],
      },
    },
  },
]);
