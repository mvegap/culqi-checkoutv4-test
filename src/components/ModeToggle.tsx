"use client";

import { useKeys } from "./KeysProvider";

export default function ModeToggle() {
  const { mode, setMode, hasLive } = useKeys();
  const isLive = mode === "live";

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-semibold">
          Modo: {isLive ? "Producción 🔴" : "Sandbox 🧪"}
        </p>
        <p className="text-xs text-gray-500">
          {isLive
            ? "Los cargos son reales y se cobrarán a la tarjeta."
            : "Cargos de prueba — usa tarjetas de test de Culqi."}
        </p>
      </div>

      <label className="inline-flex cursor-pointer items-center gap-2">
        <span className="text-xs text-gray-600">Test</span>
        <span className="relative inline-block">
          <input
            type="checkbox"
            checked={isLive}
            disabled={!hasLive}
            onChange={(e) => setMode(e.target.checked ? "live" : "test")}
            className="peer sr-only"
          />
          <span className="block h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-red-500 peer-disabled:opacity-50" />
          <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-5" />
        </span>
        <span className="text-xs text-gray-600">Live</span>
      </label>

      {!hasLive && (
        <span className="ml-3 text-xs text-gray-400">
          (configura llaves live para habilitar)
        </span>
      )}
    </div>
  );
}
