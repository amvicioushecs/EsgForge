/**
 * GDPR Article 5(1)(c) — data minimization control.
 *
 * Shopify order payloads contain full customer addresses (street line 1/2, city,
 * region, ZIP, country). For our emissions calculations we only need the postal
 * code and country code to look up the right emission factor region. Everything
 * else is stripped before persistence and never written to any table.
 *
 * This helper is the single chokepoint for that minimization — any code path
 * that ingests Shopify address data must route through it.
 */
export interface MinimalAddress {
  zip: string | null;
  country: string | null;
}

interface ShopifyAddressLike {
  zip?: unknown;
  postal_code?: unknown;
  country_code?: unknown;
  country?: unknown;
}

export function minimizeShopifyAddress(input: unknown): MinimalAddress {
  if (!input || typeof input !== "object") return { zip: null, country: null };
  const a = input as ShopifyAddressLike;
  const zipRaw = (a.zip ?? a.postal_code ?? "") as unknown;
  const countryRaw = (a.country_code ?? a.country ?? "") as unknown;
  const zip = typeof zipRaw === "string" ? zipRaw.trim().slice(0, 20) : null;
  const country = typeof countryRaw === "string" ? countryRaw.trim().slice(0, 8).toUpperCase() : null;
  return {
    zip: zip || null,
    country: country || null,
  };
}
