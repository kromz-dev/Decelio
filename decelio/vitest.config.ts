import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // `next/font/google` s'appuie sur une transformation SWC propre à Next.js ;
      // hors de ce pipeline (donc sous Vitest), voir test/mocks/next-font-google.ts.
      "next/font/google": path.join(root, "test/mocks/next-font-google.ts"),
      "@": root,
    },
  },
  test: {
    server: {
      deps: {
        inline: ["next-auth"],
      },
    },
  },
});
