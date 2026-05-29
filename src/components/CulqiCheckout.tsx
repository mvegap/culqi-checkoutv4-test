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

interface Props {
  product: {
    title: string;
    priceCents: number; // céntimos PEN
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
    if (!product.priceCents || product.priceCents < 300) {
      setStatus({
        kind: "error",
        message:
          "El monto mínimo es S/ 3.00 (necesario para habilitar PagoEfectivo).",
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

    // Creamos la orden de pago: habilita PagoEfectivo, agente y banca móvil
    setStatus({ kind: "loading", message: "Creando orden de pago..." });
    let orderId: string;
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: product.priceCents,
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

    const CulqiCheckoutCtor = window.CulqiCheckout;
    if (!CulqiCheckoutCtor) {
      setStatus({
        kind: "error",
        message: "No se pudo cargar Culqi Checkout. Recarga la página.",
      });
      return;
    }

    setStatus({ kind: "idle" });

    const paymentMethods = {
      tarjeta: true,
      yape: true,
      billetera: true,
      bancaMovil: true,
      agente: true,
      cuotealo: true,
    };

    const config: CulqiCheckoutConfig = {
      settings: {
        title: MERCHANT_NAME,
        currency: "PEN",
        amount: product.priceCents,
        order: orderId,
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
    : `Pagar S/ ${(product.priceCents / 100).toFixed(2)}`;
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

      <button
        type="button"
        onClick={openCheckout}
        disabled={busy || !scriptReady || !active}
        className={`w-full rounded-md px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50 ${buttonColor}`}
      >
        {buttonLabel}
      </button>

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
