import js from "@eslint/js";
import globals from "globals";

export default [
  {
    // Built/generated artifacts and data are not authored here — the CDMX map is
    // built in ignacio-ireta/cdmx-convenience-map, the dogma demo by
    // tools/dogma-demo/build.mjs. Do not lint them.
    ignores: [
      "**/node_modules/**",
      "projects/cdmx-map/assets/**",
      "projects/cdmx-map/data/**",
      "projects/dogma/**",
      "tools/dogma-demo/.build/**"
    ]
  },
  js.configs.recommended,
  {
    // Browser ES modules: the homepage canvas background and the per-project
    // page scripts (e.g. the ETF showcase's lazy-embed + metrics renderer).
    files: ["src/**/*.js", "projects/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser }
    },
    rules: {
      "no-unused-vars": "warn"
    }
  },
  {
    // Node tooling: tests, scripts, build tools, and config files.
    files: ["tests/**/*.{js,mjs}", "scripts/**/*.{js,mjs}", "tools/**/*.{js,mjs}", "*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node }
    }
  }
];
