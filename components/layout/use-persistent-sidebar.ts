"use client";

import { useEffect, useState } from "react";

const KEY = "syncrio.sidebar.collapsed";

export function usePersistentSidebar() {
  const read = () => {
    try {
      const v = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
      if (v === "1" || v === "0") return v === "1";
    } catch {}
    return false;
  };

  const [collapsed, setCollapsed] = useState<boolean>(() => read());

  useEffect(() => {
    try { window.localStorage.setItem(KEY, collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      const next = e.newValue === "1";
      setCollapsed(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return [collapsed, setCollapsed] as const;
}

