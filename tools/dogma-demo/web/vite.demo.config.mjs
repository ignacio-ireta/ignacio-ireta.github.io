// Vite config for the demo build. build.mjs copies it into the staged copy of dogma's web/
// folder, so plugins resolve from dogma's own node_modules. Mirrors dogma's vite.config.ts build
// options; adds the GitHub Pages base path, ES module workers and the Pyodide version.
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (run tools/dogma-demo/build.mjs)`);
  return value;
};

export default defineConfig({
  base: required("DEMO_BASE"),
  plugins: [react()],
  define: {
    __PYODIDE_VERSION__: JSON.stringify(required("PYODIDE_VERSION"))
  },
  worker: { format: "es" },
  build: {
    outDir: required("DEMO_OUT_DIR"),
    emptyOutDir: true,
    assetsInlineLimit: 0,
    sourcemap: false,
    target: "es2023"
  }
});
