"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useKeys } from "./KeysProvider";
import { MERCHANT_NAME, MERCHANT_LOGO } from "@/lib/keys";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; message: string }
  | { kind: "success"; chargeId: string }
  | { kind: "order"; orderId: string; paymentCode?: string }
  | { kind: "error"; message: string };

export type Currency = "PEN" | "USD";

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  PEN: "S/",
  USD: "US$",
};

// Monto mínimo por moneda: PEN habilita PagoEfectivo (S/ 3.00);
// USD solo admite tarjeta, con un mínimo razonable de US$ 1.00.
export const MIN_AMOUNT_CENTS: Record<Currency, number> = {
  PEN: 300,
  USD: 100,
};

interface Props {
  product: {
    title: string;
    priceCents: number; // céntimos en la moneda seleccionada
    currency: Currency;
    description: string;
  };
}

// Checkout Custom (reemplaza a checkout.culqi.com/js/v4, en deprecación)
const CULQI_SCRIPT_SRC = "https://js.culqi.com/checkout-js";

// Tema sobrio y moderno para el modal de Checkout
const CHECKOUT_APPEARANCE = {
  theme: "default",
  hiddenCulqiLogo: false,
  menuType: "sidebar",
  buttonCardPayText: "Pagar",
  logo: MERCHANT_LOGO,
  defaultStyle: {
    bannerColor: "#0F172A",
    buttonBackground: "#4F46E5",
    menuColor: "#0F172A",
    linksColor: "#4F46E5",
    buttonTextColor: "#FFFFFF",
    priceColor: "#0F172A",
  },
  variables: {
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontWeightNormal: "500",
    borderRadius: "10px",
    colorBackground: "#FFFFFF",
    colorPrimary: "#4F46E5",
    colorPrimaryText: "#FFFFFF",
    colorText: "#1F2937",
    colorTextSecondary: "#6B7280",
    colorTextPlaceholder: "#9CA3AF",
    colorIconTab: "#4F46E5",
    colorLogo: "dark",
  },
};

function waitForCulqi(timeoutMs = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (
        typeof window !== "undefined" &&
        typeof window.CulqiCheckout !== "undefined"
      ) {
        resolve(true);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        resolve(false);
        return;
      }
      setTimeout(tick, 100);
    };
    tick();
  });
}

export default function CulqiCheckout({ product }: Props) {
  const { active, mode } = useKeys();
  const [scriptReady, setScriptReady] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const culqiRef = useRef<CulqiCheckout | null>(null);

  useEffect(() => {
    let cancelled = false;
    waitForCulqi().then((ok) => {
      if (!cancelled && ok) setScriptReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Procesa el cargo inmediato (tarjeta / Yape) con el token generado
  const chargeToken = async (tokenId: string) => {
    if (!active) {
      setStatus({
        kind: "error",
        message: "No hay llaves activas para procesar el cargo.",
      });
      return;
    }
    setStatus({ kind: "loading", message: "Procesando cargo..." });
    try {
      const res = await fetch("/api/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId,
          email,
          amount: product.priceCents,
          currency: product.currency,
          description: product.title,
          secretKey: active.secretKey,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({
          kind: "error",
          message:
            data?.error?.user_message ||
            data?.error?.merchant_message ||
            data?.message ||
            "No se pudo procesar el cargo.",
        });
        return;
      }
      setStatus({ kind: "success", chargeId: data.id });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Error de red inesperado.",
      });
    }
  };

  const openCheckout = async () => {
    if (!active) {
      setStatus({
        kind: "error",
        message: "Falta configurar las llaves del modo activo.",
      });
      return;
    }
    if (!email || !firstName || !lastName || !phone) {
      setStatus({
        kind: "error",
        message: "Completa nombre, apellido, email y teléfono.",
      });
      return;
    }
    const minAmount = MIN_AMOUNT_CENTS[product.currency];
    if (!product.priceCents || product.priceCents < minAmount) {
      setStatus({
        kind: "error",
        message:
          product.currency === "PEN"
            ? "El monto mínimo es S/ 3.00 (necesario para habilitar PagoEfectivo)."
            : `El monto mínimo en USD es ${CURRENCY_SYMBOL.USD} 1.00.`,
      });
      return;
    }

    if (typeof window.CulqiCheckout === "undefined") {
      const ok = await waitForCulqi(3000);
      if (!ok) {
        setStatus({
          kind: "error",
          message:
            "No se pudo cargar Culqi Checkout. Revisa la conexión o bloqueadores.",
        });
        return;
      }
      setScriptReady(true);
    }

    // Las órdenes (PagoEfectivo, agente, banca móvil) solo operan en soles;
    // en USD solo se ofrece pago con tarjeta, sin necesidad de crear orden.
    const isPen = product.currency === "PEN";
    let orderId: string | undefined;

    if (isPen) {
      setStatus({ kind: "loading", message: "Creando orden de pago..." });
      try {
        const res = await fetch("/api/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: product.priceCents,
            currency: product.currency,
            description: product.title,
            firstName,
            lastName,
            email,
            phoneNumber: phone,
            secretKey: active.secretKey,
            mode,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus({
            kind: "error",
            message:
              data?.error?.user_message ||
              data?.error?.merchant_message ||
              data?.message ||
              "No se pudo crear la orden de pago.",
          });
          return;
        }
        orderId = data.id;
      } catch (err) {
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : "Error de red inesperado.",
        });
        return;
      }
    }

    const CulqiCheckoutCtor = window.CulqiCheckout;
    if (!CulqiCheckoutCtor) {
      setStatus({
        kind: "error",
        message: "No se pudo cargar Culqi Checkout. Recarga la página.",
      });
      return;
    }

    setStatus({ kind: "idle" });

    // Yape, billetera, banca móvil, agente y cuotéalo solo están disponibles en PEN
    const paymentMethods = isPen
      ? {
          tarjeta: true,
          yape: true,
          billetera: true,
          bancaMovil: true,
          agente: true,
          cuotealo: true,
        }
      : {
          tarjeta: true,
        };

    const config: CulqiCheckoutConfig = {
      settings: {
        title: MERCHANT_NAME,
        currency: product.currency,
        amount: product.priceCents,
        ...(orderId ? { order: orderId } : {}),
      },
      client: { email },
      options: {
        lang: "auto",
        installments: false,
        modal: true,
        paymentMethods,
        paymentMethodsSort: Object.keys(paymentMethods),
      },
      appearance: CHECKOUT_APPEARANCE,
    };

    const instance = new CulqiCheckoutCtor(active.publicKey, config);
    culqiRef.current = instance;

    instance.culqi = () => {
      if (instance.token) {
        const tokenId = instance.token.id;
        instance.close();
        void chargeToken(tokenId);
      } else if (instance.order) {
        instance.close();
        setStatus({
          kind: "order",
          orderId: instance.order.id,
          paymentCode: instance.order.payment_code,
        });
      } else if (instance.error) {
        setStatus({
          kind: "error",
          message:
            instance.error.user_message ||
            instance.error.merchant_message ||
            "Culqi devolvió un error.",
        });
      }
    };

    instance.open();
  };

  const busy = status.kind === "loading";
  const buttonLabel = busy
    ? "Procesando..."
    : `Pagar ${CURRENCY_SYMBOL[product.currency]} ${(product.priceCents / 100).toFixed(2)}`;
  const buttonColor =
    mode === "live"
      ? "bg-rose-600 hover:bg-rose-700"
      : "bg-indigo-600 hover:bg-indigo-700";

  return (
    <div className="space-y-4">
      <Script
        src={CULQI_SCRIPT_SRC}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-slate-700">
          Nombre
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Juan"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            disabled={busy}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Apellido
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Pérez"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            disabled={busy}
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Email del comprador
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="cliente@ejemplo.com"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          disabled={busy}
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Teléfono
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="999999999"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          disabled={busy}
        />
      </label>

      {product.currency === "USD" && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          En USD solo está disponible el pago con tarjeta. Cambia a PEN para
          habilitar Yape, banca móvil, agente y PagoEfectivo.
        </p>
      )}

      <button
        type="button"
        onClick={openCheckout}
        disabled={busy || !scriptReady || !active}
        className={`flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50 ${buttonColor}`}
      >
        <LockIcon className="h-4 w-4" />
        {buttonLabel}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <ShieldIcon className="h-4 w-4 text-emerald-600" />
        Pago seguro protegido por Culqi · Verificado con 3D Secure
      </p>

      {status.kind === "success" && (
        <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          ✅ Cargo aprobado. ID:{" "}
          <code className="font-mono">{status.chargeId}</code>
        </div>
      )}
      {status.kind === "order" && (
        <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          ✅ Orden generada. El comprador recibirá las instrucciones de pago por
          email. ID: <code className="font-mono">{status.orderId}</code>
          {status.paymentCode && (
            <>
              {" "}
              · Código CIP:{" "}
              <code className="font-mono">{status.paymentCode}</code>
            </>
          )}
        </div>
      )}
      {status.kind === "error" && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          ❌ {status.message}
        </div>
      )}
      {status.kind === "loading" && (
        <div className="rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-800">
          ⏳ {status.message}
        </div>
      )}
    </div>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
