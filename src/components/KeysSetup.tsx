"use client";

import { useState } from "react";
import { CulqiKeys, hasTestKeys } from "@/lib/keys";
import { useKeys } from "./KeysProvider";

interface Props {
  onDone?: () => void;
}

export default function KeysSetup({ onDone }: Props) {
  const { keys, setKeys } = useKeys();
  const [draft, setDraft] = useState<CulqiKeys>(keys);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof CulqiKeys, value: string) => {
    setDraft((d) => ({ ...d, [field]: value.trim() }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!draft.pkTest.startsWith("pk_test_")) {
      return setError("La llave pública de integración debe empezar con pk_test_");
    }
    if (!draft.skTest.startsWith("sk_test_")) {
      return setError("La llave secreta de integración debe empezar con sk_test_");
    }
    if (draft.pkLive && !draft.pkLive.startsWith("pk_live_")) {
      return setError("La llave pública de producción debe empezar con pk_live_");
    }
    if (draft.skLive && !draft.skLive.startsWith("sk_live_")) {
      return setError("La llave secreta de producción debe empezar con sk_live_");
    }
    if (Boolean(draft.pkLive) !== Boolean(draft.skLive)) {
      return setError("Si configuras producción, necesitas ambas llaves live.");
    }

    setKeys(draft);
    onDone?.();
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <header>
        <h2 className="text-xl font-semibold">Configura tus llaves Culqi</h2>
        <p className="mt-1 text-sm text-gray-600">
          Las llaves se guardan en <code>localStorage</code> de este navegador.
          No se envían a ningún servidor externo (solo a Culqi al cobrar).
        </p>
      </header>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold uppercase tracking-wider text-culqi-primary/70">
          Integración (sandbox) — requerido
        </legend>
        <KeyInput
          label="Public key (pk_test_)"
          value={draft.pkTest}
          onChange={(v) => update("pkTest", v)}
          placeholder="pk_test_xxxxxxxxxxxxxxxx"
        />
        <KeyInput
          label="Secret key (sk_test_)"
          value={draft.skTest}
          onChange={(v) => update("skTest", v)}
          placeholder="sk_test_xxxxxxxxxxxxxxxx"
          isSecret
        />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold uppercase tracking-wider text-culqi-primary/70">
          Producción (cobros reales) — opcional
        </legend>
        <KeyInput
          label="Public key (pk_live_)"
          value={draft.pkLive}
          onChange={(v) => update("pkLive", v)}
          placeholder="pk_live_xxxxxxxxxxxxxxxx"
        />
        <KeyInput
          label="Secret key (sk_live_)"
          value={draft.skLive}
          onChange={(v) => update("skLive", v)}
          placeholder="sk_live_xxxxxxxxxxxxxxxx"
          isSecret
        />
      </fieldset>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {hasTestKeys(draft) ? "✅ Listo para sandbox" : "Completa al menos las test keys"}
        </span>
        <button
          type="submit"
          className="rounded-md bg-culqi-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Guardar y continuar
        </button>
      </div>
    </form>
  );
}

function KeyInput({
  label,
  value,
  onChange,
  placeholder,
  isSecret,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  isSecret?: boolean;
}) {
  const [reveal, setReveal] = useState(false);
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-1 flex gap-2">
        <input
          type={isSecret && !reveal ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs focus:border-culqi-primary focus:outline-none"
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="rounded-md border border-gray-300 px-3 text-xs hover:bg-gray-50"
          >
            {reveal ? "ocultar" : "ver"}
          </button>
        )}
      </div>
    </label>
  );
}
