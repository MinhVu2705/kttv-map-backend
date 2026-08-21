// generate.ts — Entry point chay boi GitHub Actions cron (xem
// .github/workflows/generate-map.yml). Fetch luoi diem tu KTTV, noi suy IDW,
// raster hoa ra 2 anh PNG (temp/rain) + 1 file meta.json, ghi vao thu muc
// output/ de workflow deploy len GitHub Pages (branch gh-pages).

import { mkdir, writeFile } from "node:fs/promises";
import { getCurrentData } from "./kttvClient.js";
import { generateGrid, VIETNAM_BOUNDS, type WeatherSample } from "./interpolate.js";
import { rasterizeToPNG } from "./raster.js";

// Luoi lay du lieu that tu API - 18x11 = 198 diem, dong hon 77 diem cu ben
// client vi backend chi fetch 1 lan/chu ky cho toan bo nguoi dung, khong
// phai fetch lai moi lan mo app.
const SOURCE_GRID_ROWS = 18;
const SOURCE_GRID_COLS = 11;
const FETCH_CONCURRENCY = 8;

// Kich thuoc anh raster dau ra - ti le khop VIETNAM_BOUNDS (~2.03 cao/rong).
const OUTPUT_WIDTH = 220;
const OUTPUT_HEIGHT = 446;

const OUTPUT_DIR = new URL("../output/", import.meta.url);

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(new Array(Math.min(concurrency, items.length)).fill(0).map(worker));
  return results;
}

async function fetchSamples(): Promise<WeatherSample[]> {
  const grid = generateGrid(SOURCE_GRID_ROWS, SOURCE_GRID_COLS);
  return mapWithConcurrency(grid, FETCH_CONCURRENCY, async (point) => {
    try {
      const data = await getCurrentData(point.lat, point.lon);
      const temp = Number.isFinite(data?.t2m) ? Math.round(data!.t2m as number) : null;
      const rain = Number.isFinite(data?.rain) ? Number(data!.rain) : null;
      return { ...point, temp, rain };
    } catch {
      return { ...point, temp: null, rain: null };
    }
  });
}

async function main() {
  console.log(`[generate] Fetching ${SOURCE_GRID_ROWS * SOURCE_GRID_COLS} points from KTTV...`);
  const samples = await fetchSamples();

  const validTemp = samples.filter((s) => s.temp !== null).length;
  const validRain = samples.filter((s) => s.rain !== null).length;
  console.log(`[generate] Got ${validTemp}/${samples.length} temp, ${validRain}/${samples.length} rain`);

  if (validTemp === 0) {
    throw new Error("Khong lay duoc du lieu nhiet do nao tu KTTV - dung, khong ghi de output cu.");
  }

  const tempPng = rasterizeToPNG(samples, { width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT, field: "temp" });
  const rainPng = rasterizeToPNG(samples, { width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT, field: "rain" });

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(new URL("temp.png", OUTPUT_DIR), tempPng);
  await writeFile(new URL("rain.png", OUTPUT_DIR), rainPng);
  await writeFile(
    new URL("meta.json", OUTPUT_DIR),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        bounds: VIETNAM_BOUNDS,
        width: OUTPUT_WIDTH,
        height: OUTPUT_HEIGHT,
        sourcePoints: samples.length,
        validTempPoints: validTemp,
        validRainPoints: validRain,
      },
      null,
      2
    )
  );

  console.log("[generate] Done.");
}

main().catch((err) => {
  console.error("[generate] Failed:", err);
  process.exit(1);
});
