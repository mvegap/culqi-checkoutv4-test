"use client";

import { useState } from "react";
import CulqiCheckout, {
  type Currency,
  CURRENCY_SYMBOL,
  MIN_AMOUNT_CENTS,
} from "@/components/CulqiCheckout";
import KeysSetup from "@/components/KeysSetup";
import ModeToggle from "@/components/ModeToggle";
import Credits from "@/components/Credits";
import { useKeys } from "@/components/KeysProvider";
import { MERCHANT_NAME } from "@/lib/keys";

const PRODUCT_BASE = {
  title: "Polo Edición Limitada",
  description:
    "Producto de demostración para validar pagos con Culqi: tarjeta, Yape, billeteras y PagoEfectivo.",
};

const DEFAULT_AMOUNT_BY_CURRENCY: Record<Currency, string> = {
  PEN: "15.00",
  USD: "10.00",
};

export default function Home() {
  const { hydrated, hasTest, clear } = useKeys();
  const [editing, setEditing] = useState(false);
  const [currency, setCurrency] = useState<Currency>("PEN");
  const [amountValue, setAmountValue] = useState(
    DEFAULT_AMOUNT_BY_CURRENCY.PEN
  );

  const priceCents = amountToCents(amountValue);
  const product = { ...PRODUCT_BASE, priceCents, currency };
  const symbol = CURRENCY_SYMBOL[currency];
  const minAmount = MIN_AMOUNT_CENTS[currency] / 100;

  const handleCurrencyChange = (next: Currency) => {
    if (next === currency) return;
    setCurrency(next);
    setAmountValue(DEFAULT_AMOUNT_BY_CURRENCY[next]);
  };

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12 text-sm text-slate-500">
        Cargando...
      </main>
    );
  }

  const showSetup = !hasTest || editing;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            {MERCHANT_NAME}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Finalizar compra
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Revisa tu pedido y completa el pago de forma segura.
          </p>
        </div>

        {hasTest && !editing && (
          <div className="flex flex-col items-end gap-1 text-xs">
            <button
              onClick={() => setEditing(true)}
              className="font-medium text-slate-500 hover:text-slate-800"
            >
              Editar llaves
            </button>
            <button
              onClick={() => {
                if (confirm("¿Borrar todas las llaves guardadas?")) clear();
              }}
              className="font-medium text-slate-400 hover:text-red-600"
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

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    Edición limitada
                  </span>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">
                    {product.title}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">
                    {product.description}
                  </p>
                </div>
                <span className="shrink-0 text-base font-semibold text-slate-900">
                  {symbol} {amountValue}
                </span>
              </div>

              <div>
                  <span className="block text-sm font-medium text-slate-700">
                    Moneda
                  </span>
                  <div className="mt-1.5 inline-flex rounded-lg border border-slate-300 p-1">
                    {(["PEN", "USD"] as Currency[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleCurrencyChange(c)}
                        className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                          currency === c
                            ? "bg-indigo-600 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

              <div>
                  <label
                    htmlFor="amount"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Monto a cobrar
                  </label>
                  <div className="mt-1.5 flex items-center rounded-lg border border-slate-300 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                    <span className="pl-3 text-sm font-medium text-slate-400">
                      {symbol}
                    </span>
                    <input
                      id="amount"
                      type="number"
                      inputMode="decimal"
                      min={minAmount}
                      step="0.10"
                      value={amountValue}
                      onChange={(e) => setAmountValue(e.target.value)}
                      onBlur={() => {
                        const n = parseFloat(amountValue);
                        if (!isNaN(n) && n > 0) setAmountValue(n.toFixed(2));
                      }}
                      className="w-full rounded-lg border-0 bg-transparent px-2 py-2.5 text-lg font-semibold text-slate-900 focus:outline-none focus:ring-0"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    {priceCents > 0
                      ? `Equivale a ${priceCents} céntimos. Mínimo ${symbol} ${minAmount.toFixed(2)}.`
                      : "Ingresa un monto válido."}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span>{symbol} {amountValue}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                    <span>Total</span>
                    <span>{symbol} {amountValue}</span>
                  </div>
                </div>

                <CulqiCheckout product={product} />
              </div>
          </section>
        </>
      )}

      <Credits />
    </main>
  );
}

function amountToCents(value: string): number {
  const n = parseFloat(value);
  if (isNaN(n) || n <= 0) return 0;
  return Math.round(n * 100);
}
