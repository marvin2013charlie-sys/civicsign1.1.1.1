import { useEffect } from "react";
import { applyPageSeo } from "@/lib/seo";

/**
 * Updates document title, meta tags, canonical URL and JSON-LD for the current view.
 * Later calls (e.g. dynamic blog posts) override route defaults from SeoManager.
 */
export function usePageSeo(meta) {
  useEffect(() => {
    if (!meta) return undefined;
    applyPageSeo(meta);
    return undefined;
  }, [meta]);
}