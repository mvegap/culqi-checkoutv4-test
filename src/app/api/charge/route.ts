import { NextResponse } from "next/server";

const CULQI_API = "https://api.culqi.com/v2/charges";

interface ChargeBody {
  tokenId?: string;
  email?: string;
  amount?: number; // céntimos
  currency?: "PEN" | "USD";
  description?: string;
  secretKey?: string; // sk_test_ o sk_live_, provista por el cliente
  mode?: "test" | "live";
}

export async function POST(req: Request) {
  let body: ChargeBody;
  try {
    body = (await req.json()) as ChargeBody;
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const { tokenId, email, amount, currency, description, secretKey, mode } =
    body;
  const currencyCode = currency === "USD" ? "USD" : "PEN";

  if (!tokenId || !email || !amount || !secretKey) {
    return NextResponse.json(
      { message: "Faltan campos: tokenId, email, amount o secretKey." },
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

  const payload = {
    amount,
    currency_code: currencyCode,
    email,
    source_id: tokenId,
    capture: true,
    description: description?.slice(0, 80) ?? "Compra demo",
    antifraud_details: {
      address: "Av. Lima 123",
      address_city: "LIMA",
      country_code: "PE",
      first_name: "Cliente",
      last_name: "Demo",
      phone_number: "999999999",
    },
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
    outcome: data.outcome,
    amount: data.amount,
    currency_code: data.currency_code,
  });
}
