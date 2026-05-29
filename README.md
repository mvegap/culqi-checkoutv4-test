# merchant-market-test

> **Equipo:** Gestión de Comercios  
> **Autores:**
> - Sandra Lara — Product Owner
> - Tania Del Milagro Guizado — Business Specialist
> - Miguel Vega — Tech Lead

Tienda demo en **Next.js 14 (App Router) + Tailwind** para validar la integración con **Culqi** (Checkout v4) y procesar pagos reales.

- Frontend: `Culqi Checkout` (modal) cargado desde `https://js.culqi.com/checkout-js`.
- Backend: Route Handler `POST /api/charge` que crea el cargo contra `https://api.culqi.com/v2/charges` con tu `sk_`.
- Doc base: <https://docs.culqi.com/es/documentacion/pagos-online/cargo-unico/resumen>

## 1. Setup

```bash
npm install
cp .env.example .env.local   # y completa las llaves reales en .env.local
```

`.env.local`:

```
NEXT_PUBLIC_CULQI_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxx
CULQI_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
```

> ⚠️ La `sk_` **nunca** debe llevar el prefijo `NEXT_PUBLIC_`. Solo vive en el servidor.

## 2. Correr

```bash
npm run dev
```

Abre <http://localhost:3000>.

## 3. Probar (modo integración / sandbox)

Usa la llave `pk_test_` / `sk_test_`. Tarjetas de prueba oficiales en
<https://docs.culqi.com/es/documentacion/desarrolladores/tarjetas-de-prueba>.
Ejemplo:

| Marca | Número | CVV | Exp |
|---|---|---|---|
| VISA | 4111 1111 1111 1111 | 123 | 09/2030 |

## 4. Pasar a producción (cobros reales)

1. Cambia las dos variables a `pk_live_...` y `sk_live_...`.
2. Reinicia el servidor (`npm run dev` o `npm run build && npm start`).
3. En el footer de la página verás el badge **PRODUCCIÓN (cobros reales)**.

## 5. Arquitectura

```
src/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx                # Producto + monto
│  ├─ globals.css
│  └─ api/charge/route.ts     # POST → Culqi /v2/charges
├─ components/
│  └─ CulqiCheckout.tsx       # Carga Culqi.js v4, abre modal, recibe token
└─ types/
   └─ culqi.d.ts
```

### Flujo

1. Usuario ingresa email y hace click en **Pagar**.
2. Se abre el modal de Culqi Checkout (tarjeta / Yape).
3. Culqi devuelve `Culqi.token.id` al callback `window.culqi()`.
4. El front envía `{ tokenId, email, amount, description }` a `/api/charge`.
5. El backend hace `POST https://api.culqi.com/v2/charges` con `Authorization: Bearer sk_...`.
6. Devuelve `{ id, state, outcome }`. Si el `state` es `paid` → cargo aprobado.
