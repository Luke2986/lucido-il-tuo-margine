// Hook per leggere lo store assicurandosi che i dati siano stati caricati dal DB.

import { useEffect, useState } from "react";
import { useLucidoStore } from "./store";

export function useHydratedStore<T>(selector: (s: ReturnType<typeof useLucidoStore.getState>) => T): T {
  const value = useLucidoStore(selector);
  useEffect(() => {
    const s = useLucidoStore.getState();
    if (!s.loaded && !s.loading) void s.loadAll();
  }, []);
  return value;
}

export function useIsHydrated(): boolean {
  const loaded = useLucidoStore((s) => s.loaded);
  const loading = useLucidoStore((s) => s.loading);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const s = useLucidoStore.getState();
    if (!s.loaded && !s.loading) void s.loadAll();
  }, []);
  return mounted && loaded && !loading;
}
