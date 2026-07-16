import { useCallback, useEffect, useState } from "react";

function readStoredCollapsed(storageKey) {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

export function useCollapsibleSidebar(storageKey) {
  const [collapsed, setCollapsed] = useState(() => readStoredCollapsed(storageKey));

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, collapsed ? "1" : "0");
    } catch {
      /* persistence is best-effort */
    }
  }, [collapsed, storageKey]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return { collapsed, toggle, setCollapsed };
}