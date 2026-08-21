// raster.ts — Ve luoi gia tri da noi suy ra 1 anh PNG RGBA bang pngjs (thu
// vien PNG thuan JS, khong can native binding nhu node-canvas) - de deploy
// tren GitHub Actions runner khong vuong build native module.

import { PNG } from "pngjs";
import {
  VIETNAM_BOUNDS,
  interpolateIDW,
  tempToRGB,
  rainToRGB,
  RAIN_MIN_VISIBLE,
  type WeatherSample,
} from "./interpolate.js";

export interface RasterOptions {
  width: number;
  height: number;
  field: "temp" | "rain";
  opacity?: number; // 0-255, alpha cua vung co du lieu
}

export function rasterizeToPNG(samples: WeatherSample[], opts: RasterOptions): Buffer {
  const { width, height, field, opacity = 190 } = opts;
  const png = new PNG({ width, height });
  const bounds = VIETNAM_BOUNDS;

  for (let y = 0; y < height; y++) {
    const lat = bounds.maxLat - (y / (height - 1)) * (bounds.maxLat - bounds.minLat);
    for (let x = 0; x < width; x++) {
      const lon = bounds.minLon + (x / (width - 1)) * (bounds.maxLon - bounds.minLon);
      const value = interpolateIDW({ lat, lon }, samples, field);
      const idx = (width * y + x) << 2;

      if (value === null || (field === "rain" && value < RAIN_MIN_VISIBLE)) {
        png.data[idx + 3] = 0; // trong suot - khong co du lieu / khong mua
        continue;
      }

      const [r, g, b] = field === "temp" ? tempToRGB(value) : rainToRGB(value);
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = opacity;
    }
  }

  return PNG.sync.write(png);
}
