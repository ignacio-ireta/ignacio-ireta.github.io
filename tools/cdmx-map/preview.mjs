// Screenshots the committed map embed for the homepage card: images/cdmx-map.webp.
//
//   node tools/cdmx-map/preview.mjs [--city oslo] [--browser <path to a Chromium-family binary>]
//
// Opens the city, zooms in and pans so the scored postal areas fill the frame. The map embed
// itself is built in ignacio-ireta/cdmx-convenience-map and lands here through its CI, so
// re-run this after an embed update that changes how the page looks. Basemap tiles come from
// OpenStreetMap, so it needs network access. See ../lib/page-shot.mjs for how the page is
// served and captured.
import { join } from "node:path";
import { REPO_ROOT, option, shootPage, sleep } from "../lib/page-shot.mjs";

// How far the city sits from the middle of the map pane in the default view, and where it
// should end up: the middle of the strip of map between the sidebar and the ranking.
const CITY_OFFSET = { x: 35, y: 95 };
const FRAME_OFFSET = { x: -180, y: 20 };
const ZOOM_STEPS = 2;
const KEY_PAN_PX = 80; // Leaflet's keyboard pan distance

// Scored areas are drawn and every basemap tile in view has loaded.
const MAP_SETTLED = `(() => {
  const tiles = [...document.querySelectorAll("img.leaflet-tile")];
  return document.querySelectorAll("path.leaflet-interactive").length > 0 &&
    tiles.length > 0 && tiles.every((tile) => tile.complete && tile.naturalWidth > 0);
})()`;

await shootPage({
  output: join(REPO_ROOT, "images", "cdmx-map.webp"),
  async drive(page) {
    const settled = async () => {
      await page.waitFor(MAP_SETTLED, "the map (are OpenStreetMap tiles reachable?)");
      await sleep(600); // let the tile fade-in finish
    };
    await page.send("Page.navigate", {
      url: `${page.base}/projects/cdmx-map/?city=${option("city", "oslo")}`
    });
    await settled();

    // Zoom with the map's own control, then pan with its keyboard handler. The pointer never
    // touches the map, so no area is selected and no hover tooltip is left in the shot.
    for (let step = 0; step < ZOOM_STEPS; step += 1) {
      await page.evaluate(`document.querySelector(".leaflet-control-zoom-in").click()`);
      await sleep(700);
    }
    await page.evaluate(`document.querySelector(".leaflet-container").focus()`);
    const scale = 2 ** ZOOM_STEPS;
    const right = Math.round((CITY_OFFSET.x * scale - FRAME_OFFSET.x) / KEY_PAN_PX);
    const down = Math.round((CITY_OFFSET.y * scale - FRAME_OFFSET.y) / KEY_PAN_PX);
    for (let step = 0; step < right; step += 1) await page.press("ArrowRight", 39);
    for (let step = 0; step < down; step += 1) await page.press("ArrowDown", 40);
    await page.evaluate(`document.activeElement?.blur()`);
    await settled();
  }
});
