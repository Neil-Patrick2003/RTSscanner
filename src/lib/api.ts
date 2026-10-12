/**
 * Artemis public API client.
 *
 * Backend routes (Laravel):
 *   POST /shops/scan-return            -> submit a scanned return; the shop is detected from the tracking code
 *   GET  /shops/scan-returns/summary   -> returns scanned on a day, counted per product and per shop
 *
 * NOTE: In production, load the API key from secure storage (e.g. expo-secure-store)
 * rather than hardcoding it here.
 */

const BASE_URL = 'https://ozfdv0rbfg.sharedwithexpose.com/api/v1/public'; // change per environment
const API_KEY = 'art_DSjNwyWe2YCjvw0rnjdKs1LXtOczt0RAibJfBOMy'; // from secure storage

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

export type Shop = {
  id: number | string;
  name: string;
};

export type ScanReturnPayload = {
  /** Tracking code decoded from the scanned QR code. Artemis finds the shop from it. */
  tracking_code: string;
};

export type ScanReturnResult = {
  success: boolean;
  message: string;
  /** The shop Artemis matched the tracking code to. */
  shop: Shop | null;
};

export type ProductCount = {
  /** null for shops with no product assigned in Artemis. */
  id: number | null;
  name: string;
  code: string | null;
  count: number;
  shop_count: number;
};

export type ShopCount = {
  id: number;
  name: string;
  count: number;
};

export type LastScan = {
  /** ISO 8601 */
  scanned_at: string;
  shop_id: number;
  shop_name: string;
  /** null when the shop has no product in Artemis. */
  product_id: number | null;
  product_name: string;
  tracking_code: string;
};

export type ScanSummary = {
  /** YYYY-MM-DD */
  date: string;
  total: number;
  product_count: number;
  products: ProductCount[];
  shop_count: number;
  shops: ShopCount[];
  last_scan: LastScan | null;
};

async function parseJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** POST /shops/scan-return */
export async function scanReturn(payload: ScanReturnPayload): Promise<ScanReturnResult> {
  const res = await fetch(`${BASE_URL}/shops/scan-return`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const body = await parseJson(res);

  if (!res.ok) {
    // Artemis sends `{ error }` for lookup/Pancake failures, `{ message }` for validation.
    throw new Error(body?.error ?? body?.message ?? `Scan failed (${res.status})`);
  }

  return {
    success: true,
    message: body?.message ?? 'Return recorded successfully.',
    shop: body?.shop ?? null,
  };
}

/** GET /shops/scan-returns/summary?date=YYYY-MM-DD */
export async function getScanSummary(date: string): Promise<ScanSummary> {
  const res = await fetch(`${BASE_URL}/shops/scan-returns/summary?date=${encodeURIComponent(date)}`, {
    method: 'GET',
    headers,
  });
  const body = await parseJson(res);

  if (!res.ok) {
    throw new Error(body?.error ?? body?.message ?? `Failed to load the dashboard (${res.status})`);
  }

  return body as ScanSummary;
}
