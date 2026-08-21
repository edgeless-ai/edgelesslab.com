import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-backup-autoresearch/**",
    ".standalone-stash/**",
    "_next/**",
    "docs/source-refs/**",
    "out/**",
    "build/**",
    "public/flow-viz/**",
    "public/tartanism/**",
    // Generated/vendored bundles — ~25k JS files that made `pnpm lint` run 40+ min:
    "public/marimo*/**",
    "public/total-serialism/**",
    "public/scoop-scout/**",
    "public/creative-demos/**",
    "public/pen-plotter/**",
    "public/prompt-engine/**",
    "tartanism/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
