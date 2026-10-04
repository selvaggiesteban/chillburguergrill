/**
 * Integración MercadoPago (Checkout Pro):
 * - createMpPreference: crea la preferencia y devuelve el init_point.
 * - getMpPayment: consulta un pago por id (webhook).
 * - verifyMpSignature: valida el header x-signature (HMAC-SHA256).
 *
 * Modo desarrollo: con MP_ACCESS_TOKEN vacío o "TEST-*" no se llama a la API
 * (Fase 8 se configura el token real y el flujo pasa a ser production).
 */

const MP_API = 'https://api.mercadopago.com';

export function isMockMpToken(token: string | undefined | null): boolean {
  if (!token) return true;
  return token.startsWith('TEST-') || token.startsWith('TEST_');
}

export type MpPreferenceResult = {
  preferenceId: string;
  initPoint: string;
};

export async function createMpPreference(
  token: string,
  params: {
    orderId: string;
    origin: string;
    items: { title: string; quantity: number; unitPrice: number }[];
    customerEmail?: string | null;
  }
): Promise<MpPreferenceResult> {
  const backUrl = `${params.origin}/pedido/${params.orderId}`;
  const response = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': params.orderId,
    },
    body: JSON.stringify({
      items: params.items.map((item) => ({
        title: item.title.slice(0, 100),
        quantity: item.quantity,
        unit_price: item.unitPrice,
        currency_id: 'ARS',
      })),
      external_reference: params.orderId,
      back_urls: { success: backUrl, pending: backUrl, failure: backUrl },
      statement_descriptor: 'CHILL BURGER GRILL',
      ...(params.customerEmail ? { payer: { email: params.customerEmail } } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`MercadoPago devolvió ${response.status}: ${detail.slice(0, 200)}`);
  }

  const data = (await response.json()) as { id: string; init_point: string };
  return { preferenceId: data.id, initPoint: data.init_point };
}

export type MpPaymentStatus = 'pending' | 'processing' | 'paid' | 'rejected' | 'refunded';

const STATUS_MAP: Record<string, MpPaymentStatus> = {
  approved: 'paid',
  authorized: 'processing',
  in_process: 'processing',
  in_mediation: 'processing',
  pending: 'pending',
  rejected: 'rejected',
  cancelled: 'rejected',
  refunded: 'refunded',
  charged_back: 'refunded',
};

export async function getMpPayment(
  token: string,
  paymentId: string
): Promise<{ paymentId: string; status: MpPaymentStatus; orderId: string | null }> {
  const response = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Pago no encontrado en MercadoPago (${response.status})`);
  }
  const data = (await response.json()) as {
    id: number | string;
    status: string;
    external_reference?: string | null;
  };
  return {
    paymentId: String(data.id),
    status: STATUS_MAP[data.status] ?? 'pending',
    orderId: data.external_reference ?? null,
  };
}

/**
 * Firma esperada: x-signature = "ts=<unix>,v1=<hex>"
 * manifest = "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 * HMAC-SHA256(manifest, secret) en hex con secret = MP_ACCESS_TOKEN.
 */
export async function verifyMpSignature(
  request: Request,
  token: string,
  dataId: string
): Promise<boolean> {
  const signature = request.headers.get('x-signature');
  const requestId = request.headers.get('x-request-id') ?? '';
  if (!signature || !dataId) return false;

  const parts = Object.fromEntries(
    signature.split(',').map((kv) => {
      const idx = kv.indexOf('=');
      return [kv.slice(0, idx).trim(), kv.slice(idx + 1).trim()];
    })
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(token),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(manifest));
  const expected = [...new Uint8Array(signatureBuffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return expected === v1.toLowerCase();
}
