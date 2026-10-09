/**
 * Artemis public API client.
 *
 * Backend routes (Laravel):
 *   GET  /shops                -> list shops
 *   POST /shops/scan-return    -> submit a scanned return for a shop
 *
 * NOTE: In production, load the API key from secure storage (e.g. expo-secure-store)
 * rather than hardcoding it here.
 */

const BASE_URL = 'https://efb.artemis.ph/api/v1/public'; // change per environment
const API_KEY = 'art_BgTc2rfztkpwluWK2QxqG0sxY141CGvcNIfnKsI8'; // from secure storage

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

export type Shop = {
  id: number | string;
  name: string;
  address?: string | null;
};

export type ScanReturnPayload = {
  shop_id: Shop['id'];
  /** Tracking code decoded from the scanned QR code. */
  tracking_code: string;
};

export type ScanReturnResult = {
  success: boolean;
  message: string;
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

/** GET /shops */
export async function getShops(): Promise<Shop[]> {
  const res = await fetch(`${BASE_URL}/shops`, { method: 'GET', headers });
  const body = await parseJson(res);

  if (!res.ok) {
    throw new Error(body?.message ?? `Failed to load shops (${res.status})`);
  }

  // API wraps the list in `{ shops: [...] }`; fall back to `data`/bare array.
  return (body?.shops ?? body?.data ?? body ?? []) as Shop[];
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
  };
}
