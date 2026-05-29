import { NextResponse } from "next/server";

const CULQI_API = "https://api.culqi.com/v2/orders";

// Monto mínimo para órdenes (PagoEfectivo) según Culqi: S/ 3.00
const MIN_ORDER_CENTS = 300;
// Vigencia de la orden: 3 días
const EXPIRATION_SECONDS = 3 * 24 * 60 * 60;

interface OrderBody {
  amount?: number; // céntimos
  description?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  secretKey?: string; // sk_test_ o sk_live_, provista por el cliente
  mode?: "test" | "live";
}

export async function POST(req: Request) {
  let body: OrderBody;
  try {
    body = (await req.json()) as OrderBody;
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const {
    amount,
    description,
    firstName,
    lastName,
    email,
    phoneNumber,
    secretKey,
    mode,
  } = body;

  if (!amount || !email || !firstName || !lastName || !phoneNumber || !secretKey) {
    return NextResponse.json(
      {
        message:
          "Faltan campos: amount, email, firstName, lastName, phoneNumber o secretKey.",
      },
      { status: 400 }
    );
  }

  const expectedPrefix = mode === "live" ? "sk_live_" : "sk_test_";
  if (!secretKey.startsWith(expectedPrefix)) {
    return NextResponse.json(
      {
        message: `La secretKey no corresponde al modo "${mode ?? "test"}" (se esperaba prefijo ${expectedPrefix}).`,
      },
      { status: 400 }
    );
  }

  if (amount < MIN_ORDER_CENTS) {
    return NextResponse.json(
      { message: "El monto mínimo para una orden (PagoEfectivo) es S/ 3.00." },
      { status: 400 }
    );
  }

  const payload = {
    amount,
    currency_code: "PEN",
    description: (description ?? "Compra demo").slice(0, 80),
    order_number: `ord-${Date.now()}`,
    client_details: {
      first_name: firstName,
      last_name: lastName,
      email,
      phone_number: phoneNumber,
    },
    expiration_date: Math.floor(Date.now() / 1000) + EXPIRATION_SECONDS,
    confirm: false,
  };

  const res = await fetch(CULQI_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      { error: data, message: data?.user_message ?? data?.merchant_message },
      { status: res.status }
    );
  }

  return NextResponse.json({
    id: data.id,
    state: data.state,
    amount: data.amount,
    currency_code: data.currency_code,
  });
}
