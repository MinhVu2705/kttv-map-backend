// interpolate.ts — Nguyen ven logic noi suy IDW + thang mau tu
// src/utils/mapInterpolation.ts cua app mobile (chi bo phan goi API, phan do
// nam trong kttvClient.ts + grid fetch o generate.ts). Giu y het cong thuc de
// mau tren backend va tren app luon khop nhau tuyet doi.

export interface GridPoint {
  lat: number;
  lon: number;
}

export interface WeatherSample extends GridPoint {
  temp: number | null;
  rain: number | null;
}

export const VIETNAM_BOUNDS = {
  minLat: 8.4,
  maxLat: 23.4,
  minLon: 102.1,
  maxLon: 109.5,
};

export function generateGrid(rows: number, cols: number, bounds = VIETNAM_BOUNDS): GridPoint[] {
  const points: GridPoint[] = [];
  for (let r = 0; r < rows; r++) {
    const lat = bounds.maxLat - (r / (rows - 1)) * (bounds.maxLat - bounds.minLat);
    for (let c = 0; c < cols; c++) {
      const lon = bounds.minLon + (c / (cols - 1)) * (bounds.maxLon - bounds.minLon);
      points.push({ lat, lon });
    }
  }
  return points;
}

function approxDistance(a: GridPoint, b: GridPoint): number {
  const avgLatRad = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dx = (a.lon - b.lon) * Math.cos(avgLatRad);
  const dy = a.lat - b.lat;
  return Math.sqrt(dx * dx + dy * dy);
}

export function interpolateIDW(
  target: GridPoint,
  samples: WeatherSample[],
  field: "temp" | "rain",
  power = 2
): number | null {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const sample of samples) {
    const value = sample[field];
    if (value === null || value === undefined) continue;
    const distance = approxDistance(target, sample);
    if (distance < 1e-6) return value;
    const weight = 1 / Math.pow(distance, power);
    weightedSum += weight * value;
    weightTotal += weight;
  }
  if (weightTotal === 0) return null;
  return weightedSum / weightTotal;
}

export const TEMP_COLOR_STOPS: [number, [number, number, number]][] = [
  [10, [25, 78, 200]],
  [20, [21, 156, 98]],
  [28, [214, 168, 0]],
  [34, [206, 92, 10]],
  [40, [188, 30, 24]],
];

export const RAIN_COLOR_STOPS: [number, [number, number, number]][] = [
  [0, [59, 130, 246]],
  [10, [37, 99, 235]],
  [25, [29, 78, 216]],
  [50, [67, 56, 202]],
  [80, [126, 34, 206]],
];

function interpolateColorFromStops(
  value: number,
  stops: [number, [number, number, number]][]
): [number, number, number] {
  if (value <= stops[0][0]) return stops[0][1];
  if (value >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (value >= t0 && value <= t1) {
      const ratio = (value - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * ratio),
        Math.round(c0[1] + (c1[1] - c0[1]) * ratio),
        Math.round(c0[2] + (c1[2] - c0[2]) * ratio),
      ];
    }
  }
  return stops[stops.length - 1][1];
}

export function tempToRGB(temp: number): [number, number, number] {
  return interpolateColorFromStops(temp, TEMP_COLOR_STOPS);
}

export function rainToRGB(rain: number): [number, number, number] {
  return interpolateColorFromStops(rain, RAIN_COLOR_STOPS);
}

export const RAIN_MIN_VISIBLE = 0.1;
