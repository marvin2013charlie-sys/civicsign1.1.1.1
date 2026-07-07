import React from "react";
import { useLocation } from "react-router-dom";
import { usePageSeo } from "@/hooks/usePageSeo";
import { getSeoForPath } from "@/lib/seo";

/** Applies route-based SEO defaults on every navigation. */
export function SeoManager() {
  const { pathname } = useLocation();
  usePageSeo(getSeoForPath(pathname));
  return null;
}