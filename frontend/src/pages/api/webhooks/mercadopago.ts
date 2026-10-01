import type { APIRoute } from 'astro';
import { errorJson, json } from '../../../lib/api';
import { updateOrderPayment } from '../../../lib/d1';
import { getMpPayment, isMockMpToken, verifyMpSignature } from '../../../lib/mp';

/**
 * Webhook de MercadoPago (IPN/WEBHOOK).
 * En producción se configura con:
 *   https://<dominio>/api/webhooks/mercadopago
 * Verifica la firma x-signature y actualiza el estado del pago en D1.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const token = env.MP_ACCESS_TOKEN ?? '';

  if (isMockMpToken(token)) {
    // Sin token real no hay eventos que procesar (modo desarrollo).
    return json({ ignored: true, reason: 'mock_token' });
  }

  let body: { type?: string; data?: { id?: string | number } } = {};
  try {
    body = await request.json();
  } catch {
    /* puede venir solo por query string */
  }

  const url = new URL(request.url);
  const eventType = body.type ?? url.searchParams.get('type') ?? '';
  const dataId = String(body.data?.id ?? url.searchParams.get('data.id') ?? '');

  if (eventType && eventType !== 'payment') return json({ ignored: true, reason: 'not_payment' });
  if (!dataId) return json({ ignored: true, reason: 'no_data_id' });

  const valid = await verifyMpSignature(request, token, dataId);
  if (!valid) return errorJson('Firma inválida', 401);

  try {
    const payment = await getMpPayment(token, dataId);
    if (payment.orderId) {
      await updateOrderPayment(env.DB, payment.orderId, {
        payment_status: payment.status,
        mp_payment_id: payment.paymentId,
      });
      console.log(`[webhook] order=${payment.orderId} payment=${payment.paymentId} status=${payment.status}`);
    }
    return json({ ok: true });
  } catch (e) {
    console.error('[webhook] error:', e);
    return errorJson('No se pudo procesar el evento', 500);
  }
};
