export {};

declare global {
  interface CulqiToken {
    id: string;
    email: string;
    [key: string]: unknown;
  }

  interface CulqiError {
    user_message?: string;
    merchant_message?: string;
    [key: string]: unknown;
  }

  interface CulqiOrder {
    id: string;
    state?: string;
    payment_code?: string; // CIP de PagoEfectivo
    [key: string]: unknown;
  }

  interface CulqiGlobal {
    publicKey: string;
    settings(opts: Record<string, unknown>): void;
    options(opts: Record<string, unknown>): void;
    open(): void;
    close(): void;
    token?: CulqiToken;
    order?: CulqiOrder;
    error?: CulqiError;
  }

  // eslint-disable-next-line no-var
  var Culqi: CulqiGlobal;

  interface Window {
    culqi?: () => void;
  }
}
