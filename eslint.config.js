import js from "@eslint/js";
import globals from "globals";

export default [
  {
    // Built/generated artifacts and data are not authored here — the CDMX map is
    // built in ignacio-ireta/cdmx-convenience-map. Do not lint them.
    ignores: ["node_modules/**", "projects/cdmx-map/assets/**", "projects/cdmx-map/data/**"]
  },
  js.configs.recommended,
  {
    // Browser ES modules: the homepage canvas background.
    files: ["src/**/*.js"],
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
    // Node tooling: tests, scripts, and config files.
    files: ["tests/**/*.{js,mjs}", "scripts/**/*.{js,mjs}", "*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node }
    }
  }
];
