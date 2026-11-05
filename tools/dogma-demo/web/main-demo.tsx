// Entry point of the static demo build. Mirrors dogma's src/main.tsx, with three changes:
// the API is answered in the page (demo/api.ts), routes live in the URL hash (GitHub Pages has
// no fallback to index.html), and a badge explains what the page is.
import "@fontsource-variable/inter";
import "@fontsource-variable/inter/wght-italic.css";
import "@fontsource-variable/jetbrains-mono";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/app.css";
import "./demo/demo.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import { App } from "./App";
import { installDemoApi } from "./demo/api";
import { DemoBadge } from "./demo/DemoBadge";

installDemoApi();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: false }
  }
});

const container = document.getElementById("root");
if (container === null) {
  throw new Error("index.html has no #root element");
}

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <App />
      </HashRouter>
      <DemoBadge />
    </QueryClientProvider>
  </StrictMode>
);
