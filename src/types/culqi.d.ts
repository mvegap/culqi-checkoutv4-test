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

  interface CulqiCheckoutConfig {
    settings: Record<string, unknown>;
    client?: Record<string, unknown>;
    options?: Record<string, unknown>;
    appearance?: Record<string, unknown>;
  }

  // Checkout Custom: se instancia con `new CulqiCheckout(publicKey, config)`
  class CulqiCheckout {
    constructor(publicKey: string, config: CulqiCheckoutConfig);
    open(): void;
    close(): void;
    token?: CulqiToken;
    order?: CulqiOrder;
    error?: CulqiError;
    culqi?: () => void;
  }

  interface Window {
    CulqiCheckout?: typeof CulqiCheckout;
  }
}
