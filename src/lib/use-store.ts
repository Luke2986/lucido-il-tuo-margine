// Hook per idratare lo store dal localStorage solo lato client.
// Evita mismatch SSR: durante il render server lo store usa lo stato di default (seed).

import { useEffect, useState } from "react";
import { useLucidoStore } from "./store";

export function useHydratedStore<T>(selector: (s: ReturnType<typeof useLucidoStore.getState>) => T): T {
  const [hydrated, setHydrated] = useState(false);
  const value = useLucidoStore(selector);

  useEffect(() => {
    void useLucidoStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  // Prima dell'idratazione restituisce comunque il valore corrente (seed).
  // Il flag è esposto a chi ne ha bisogno via useIsHydrated.
  void hydrated;
  return value;
}

export function useIsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    void useLucidoStore.persist.rehydrate().then(() => setHydrated(true));
  }, []);
  return hydrated;
}
