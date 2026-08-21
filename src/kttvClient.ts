// kttvClient.ts — Goi API diem cua KTTV (get_data_realtime), ky HMAC y het
// logic trong src/services/api.ts cua app mobile (xem generateSignature() o
// do) - chi chuyen tu crypto-js sang crypto built-in cua Node vi chay server,
// khong can dependency ngoai cho phan nay.

import { createHmac } from "node:crypto";

// Dung "||" chu khong phai "??" - GitHub Actions truyen secret chua khai bao
// thanh chuoi rong "" (khong phai undefined), "??" se khong fallback duoc.
const API_SECRET_KEY = process.env.KTTV_API_SECRET_KEY || "KTTV_MOBILE_SECRET_KEY";
const CLIENT_ID = process.env.KTTV_API_CLIENT_ID || "KTTV_MOBILE_CLIENT_ID";
const BASE_URL = process.env.KTTV_API_BASE_URL || "https://m.thoitietnguyhiem.gov.vn";

function sign(method: string, path: string, body = ""): { signature: string; timestamp: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${method.toUpperCase()}|${path}|${body}|${timestamp}`;
  const signature = createHmac("sha256", API_SECRET_KEY).update(payload).digest("hex");
  return { signature, timestamp };
}

export interface CurrentDataPoint {
  t2m?: number;
  rain?: number;
  [key: string]: unknown;
}

export async function getCurrentData(lat: number, lon: number): Promise<CurrentDataPoint | null> {
  const path = `/api/mobile_app_data/get_data_realtime/${lat}/${lon}`;
  const { signature, timestamp } = sign("GET", path);

  // Timeout ngan de that bai nhanh, khong treo ca workflow neu bi chan/rot
  // request (thay vi cho fetch() treo vo thoi han).
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": CLIENT_ID,
        "X-Signature": signature,
        "X-Timestamp": timestamp,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { data?: CurrentDataPoint[] };
  return json?.data?.[0] ?? null;
}
