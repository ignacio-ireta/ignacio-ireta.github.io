// Screenshots the built demo for the homepage card: images/dogma-demo.webp.
//
//   node tools/dogma-demo/preview.mjs [--browser <path to a Chromium-family binary>]
//
// Opens the problem page with the starter code (never a solution), as a returning visitor.
// See ../lib/page-shot.mjs for how the page is served and captured.
import { join } from "node:path";
import { REPO_ROOT, shootPage, sleep } from "../lib/page-shot.mjs";

const PROBLEM = "cml/vector-operations/p01-vector-projection";

await shootPage({
  output: join(REPO_ROOT, "images", "dogma-demo.webp"),
  async drive(page) {
    // A returning visitor: the introduction was seen and the demo badge is closed.
    await page.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `localStorage.setItem("dogma.welcome.seen", "1");
               localStorage.setItem("dogma-demo.badge.open", "0");`
    });
    await page.send("Page.navigate", { url: `${page.base}/projects/dogma/#/problem/${PROBLEM}` });
    await page.waitFor(
      `[...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Run")`,
      "the problem page's Run button"
    );
    await page.evaluate(`document.fonts.ready.then(() => true)`);
    await sleep(1500); // the editor and illustration settle after the fonts arrive
  }
});
