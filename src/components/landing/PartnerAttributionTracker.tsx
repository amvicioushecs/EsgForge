"use client";

import { useEffect } from "react";

/**
 * Fires once on mount: if the URL contains ?partner=CODE, POST it to /api/partner/track
 * so the server can validate the code, set the ef_partner cookie (90d) and insert a
 * partner_referral row. Failures are silent — tracking must never break the page.
 */
export function PartnerAttributionTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const code = (params.get("partner") || "").trim();
      if (!code) return;

      const landingPath = window.location.pathname + window.location.search;
      console.log("[partner-tracker] firing", { code, landingPath });

      void fetch("/api/partner/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ partner_code: code, landing_path: landingPath }),
      }).catch((err) => {
        console.error("[partner-tracker] tracker fetch failed", err);
      });
    } catch (err) {
      console.error("[partner-tracker] unexpected error", err);
    }
  }, []);

  return null;
}
