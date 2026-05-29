export type Mode = "test" | "live";

export interface CulqiKeys {
  pkTest: string;
  skTest: string;
  pkLive: string;
  skLive: string;
}

export const EMPTY_KEYS: CulqiKeys = {
  pkTest: "",
  skTest: "",
  pkLive: "",
  skLive: "",
};

export const MERCHANT_NAME = "Tienda - GC";

const STORAGE_KEY = "culqi-merchant-keys-v1";
const MODE_KEY = "culqi-merchant-mode-v1";

export function loadKeys(): CulqiKeys {
  if (typeof window === "undefined") return EMPTY_KEYS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_KEYS;
    const parsed = JSON.parse(raw) as Partial<CulqiKeys>;
    return { ...EMPTY_KEYS, ...parsed };
  } catch {
    return EMPTY_KEYS;
  }
}

export function saveKeys(keys: CulqiKeys) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function clearKeys() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(MODE_KEY);
}

export function loadMode(): Mode {
  if (typeof window === "undefined") return "test";
  const raw = localStorage.getItem(MODE_KEY);
  return raw === "live" ? "live" : "test";
}

export function saveMode(mode: Mode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODE_KEY, mode);
}

export function hasTestKeys(k: CulqiKeys): boolean {
  return (
    k.pkTest.startsWith("pk_test_") && k.skTest.startsWith("sk_test_")
  );
}

export function hasLiveKeys(k: CulqiKeys): boolean {
  return (
    k.pkLive.startsWith("pk_live_") && k.skLive.startsWith("sk_live_")
  );
}

export function activePair(
  k: CulqiKeys,
  mode: Mode
): { publicKey: string; secretKey: string } | null {
  if (mode === "test") {
    if (!hasTestKeys(k)) return null;
    return { publicKey: k.pkTest, secretKey: k.skTest };
  }
  if (!hasLiveKeys(k)) return null;
  return { publicKey: k.pkLive, secretKey: k.skLive };
}
