"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CulqiKeys,
  EMPTY_KEYS,
  Mode,
  activePair,
  clearKeys as clearStorage,
  hasLiveKeys,
  hasTestKeys,
  loadKeys,
  loadMode,
  saveKeys,
  saveMode,
} from "@/lib/keys";

interface Ctx {
  keys: CulqiKeys;
  mode: Mode;
  hydrated: boolean;
  setKeys: (k: CulqiKeys) => void;
  setMode: (m: Mode) => void;
  clear: () => void;
  hasTest: boolean;
  hasLive: boolean;
  active: { publicKey: string; secretKey: string } | null;
}

const KeysContext = createContext<Ctx | null>(null);

interface Props {
  envFallback?: Partial<CulqiKeys>;
  children: React.ReactNode;
}

export function KeysProvider({ envFallback, children }: Props) {
  const [keys, setKeysState] = useState<CulqiKeys>(EMPTY_KEYS);
  const [mode, setModeState] = useState<Mode>("test");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadKeys();
    const merged: CulqiKeys = {
      pkTest: stored.pkTest || envFallback?.pkTest || "",
      skTest: stored.skTest || envFallback?.skTest || "",
      pkLive: stored.pkLive || envFallback?.pkLive || "",
      skLive: stored.skLive || envFallback?.skLive || "",
    };
    setKeysState(merged);
    setModeState(loadMode());
    setHydrated(true);
  }, [envFallback]);

  const setKeys = useCallback((k: CulqiKeys) => {
    setKeysState(k);
    saveKeys(k);
  }, []);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    saveMode(m);
  }, []);

  const clear = useCallback(() => {
    clearStorage();
    setKeysState(EMPTY_KEYS);
    setModeState("test");
  }, []);

  const value = useMemo<Ctx>(() => {
    const hasTest = hasTestKeys(keys);
    const hasLive = hasLiveKeys(keys);
    return {
      keys,
      mode,
      hydrated,
      setKeys,
      setMode,
      clear,
      hasTest,
      hasLive,
      active: activePair(keys, mode),
    };
  }, [keys, mode, hydrated, setKeys, setMode, clear]);

  return (
    <KeysContext.Provider value={value}>{children}</KeysContext.Provider>
  );
}

export function useKeys(): Ctx {
  const v = useContext(KeysContext);
  if (!v) throw new Error("useKeys debe usarse dentro de <KeysProvider>");
  return v;
}
