"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useKeys } from "./KeysProvider";
import { MERCHANT_NAME } from "@/lib/keys";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; message: string }
  | { kind: "success"; chargeId: string }
  | { kind: "error"; message: string };

interface Props {
  product: {
    title: string;
    priceCents: number; // céntimos PEN
    description: string;
  };
}

const CULQI_SCRIPT_SRC = "https://checkout.culqi.com/js/v4";

function waitForCulqi(timeoutMs = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (typeof window !== "undefined" && typeof window.Culqi !== "undefined") {
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
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const emailRef = useRef("");
  const activeRef = useRef(active);
  const modeRef = useRef(mode);

  useEffect(() => {
    emailRef.current = email;
  }, [email]);

  useEffect(() => {
    activeRef.current = active;
    modeRef.current = mode;
  }, [active, mode]);

  useEffect(() => {
    let cancelled = false;
    waitForCulqi().then((ok) => {
      if (!cancelled && ok) setScriptReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Callback global culqi() — Culqi.js lo invoca con el token o error
  useEffect(() => {
    window.culqi = async () => {
      if (typeof Culqi === "undefined") return;

      if (Culqi.token) {
        const tokenId = Culqi.token.id;
        const pair = activeRef.current;
        if (!pair) {
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
              email: emailRef.current || Culqi.token.email,
              amount: product.priceCents,
              description: product.title,
              secretKey: pair.secretKey,
              mode: modeRef.current,
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
            message:
              err instanceof Error ? err.message : "Error de red inesperado.",
          });
        }
      } else if (Culqi.error) {
        setStatus({
          kind: "error",
          message:
            Culqi.error.user_message ||
            Culqi.error.merchant_message ||
            "Culqi devolvió un error.",
        });
      }
    };

    return () => {
      window.culqi = undefined;
    };
  }, [product.priceCents, product.title]);

  const openCheckout = async () => {
    if (!active) {
      setStatus({
        kind: "error",
        message: "Falta configurar las llaves del modo activo.",
      });
      return;
    }
    if (!email) {
      setStatus({ kind: "error", message: "Ingresa un email." });
      return;
    }
    if (!product.priceCents || product.priceCents < 100) {
      setStatus({
        kind: "error",
        message: "El monto mínimo es S/ 1.00 (100 céntimos).",
      });
      return;
    }

    if (typeof Culqi === "undefined") {
      const ok = await waitForCulqi(3000);
      if (!ok) {
        setStatus({
          kind: "error",
          message:
            "No se pudo cargar Culqi.js. Revisa la conexión o bloqueadores.",
        });
        return;
      }
      setScriptReady(true);
    }

    setStatus({ kind: "idle" });

    Culqi.publicKey = active.publicKey;
    Culqi.settings({
      title: MERCHANT_NAME,
      currency: "PEN",
      amount: product.priceCents,
    });
    Culqi.options({
      lang: "auto",
      installments: false,
      paymentMethods: {
        tarjeta: true,
        yape: true,
        bancaMovil: true,
        agente: true,
        billetera: true,
        cuotealo: true,
      },
      style: {
        logo: "",
        bannerColor: "",
        buttonBackground: mode === "live" ? "#b91c1c" : "#0E0E2C",
        menuColor: "",
        linksColor: "",
        buttonText: "Pagar",
        buttonTextColor: "#ffffff",
        priceColor: "#000000",
      },
    });
    Culqi.open();
  };

  const busy = status.kind === "loading";
  const buttonLabel = busy
    ? "Procesando..."
    : `Pagar S/ ${(product.priceCents / 100).toFixed(2)}`;
  const buttonColor =
    mode === "live"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-culqi-primary hover:opacity-90";

  return (
    <div className="space-y-4">
      <Script
        src={CULQI_SCRIPT_SRC}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      <label className="block text-sm font-medium">
        Email del comprador
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="cliente@ejemplo.com"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-culqi-primary focus:outline-none"
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
