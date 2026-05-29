"use client";

import { useState } from "react";
import CulqiCheckout from "@/components/CulqiCheckout";
import KeysSetup from "@/components/KeysSetup";
import ModeToggle from "@/components/ModeToggle";
import Credits from "@/components/Credits";
import { useKeys } from "@/components/KeysProvider";

const PRODUCT_BASE = {
  title: "Polo Culqi Edición Limitada",
  description:
    "Producto demo para validar la integración con Culqi. El cargo se realiza con tarjeta o Yape vía Culqi Checkout v4.",
};

const DEFAULT_AMOUNT_SOLES = "15.00";

export default function Home() {
  const { hydrated, hasTest, clear } = useKeys();
  const [editing, setEditing] = useState(false);
  const [amountSoles, setAmountSoles] = useState(DEFAULT_AMOUNT_SOLES);

  const priceCents = solesToCents(amountSoles);
  const product = { ...PRODUCT_BASE, priceCents };

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12 text-sm text-gray-500">
        Cargando...
      </main>
    );
  }

  const showSetup = !hasTest || editing;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-culqi-primary/60">
            Culqi · Tienda de prueba
          </p>
          <h1 className="mt-2 text-3xl font-bold">Merchant Market Test</h1>
          <p className="mt-2 text-sm text-gray-600">
            Pequeña tienda demo para validar pagos reales con tu integración Culqi.
          </p>
        </div>

        {hasTest && !editing && (
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-culqi-primary underline hover:opacity-80"
            >
              Editar llaves
            </button>
            <button
              onClick={() => {
                if (confirm("¿Borrar todas las llaves guardadas?")) clear();
              }}
              className="text-xs text-red-600 underline hover:opacity-80"
            >
              Borrar llaves
            </button>
          </div>
        )}
      </header>

      {showSetup ? (
        <KeysSetup onDone={() => setEditing(false)} />
      ) : (
        <>
          <div className="mb-6">
            <ModeToggle />
          </div>

          <section className="grid grid-cols-1 gap-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-2">
            <div className="flex aspect-square items-center justify-center rounded-xl bg-gradient-to-br from-culqi-primary to-culqi-accent text-white">
              <span className="text-6xl font-bold">C</span>
            </div>

            <div className="flex flex-col">
              <h2 className="text-xl font-semibold">{product.title}</h2>
              <p className="mt-2 text-sm text-gray-600">{product.description}</p>

              <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Monto a cobrar (S/)
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-2xl font-bold text-culqi-primary">S/</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="0.10"
                    value={amountSoles}
                    onChange={(e) => setAmountSoles(e.target.value)}
                    onBlur={() => {
                      const n = parseFloat(amountSoles);
                      if (!isNaN(n) && n > 0) setAmountSoles(n.toFixed(2));
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-2xl font-bold focus:border-culqi-primary focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[11px] font-normal normal-case tracking-normal text-gray-500">
                  {priceCents > 0
                    ? `Se enviará ${priceCents} céntimos a Culqi.`
                    : "Ingresa un monto válido."}
                </p>
              </label>

              <div className="mt-6 flex-1">
                <CulqiCheckout product={product} />
              </div>
            </div>
          </section>
        </>
      )}

      <Credits />
    </main>
  );
}

function solesToCents(value: string): number {
  const n = parseFloat(value);
  if (isNaN(n) || n <= 0) return 0;
  return Math.round(n * 100);
}
