import { useMemo, useState } from 'react';
import { useCart, cartSubtotal, clearCart, unitPriceOf, type CartItem } from '../../lib/cart';
import { saveLastOrder } from '../../lib/notifications';
import { formatPrice } from '../../lib/utils';

type Zone = { name: string; cost: number };

type Props = {
  zones: Zone[];
  freeFrom: number;
  payments: { mercadopago: boolean; transfer: boolean; cash: boolean };
};

type PaymentMethod = 'mercadopago' | 'transfer' | 'cash';

const PAYMENT_LABELS: Record<PaymentMethod, { title: string; hint: string }> = {
  mercadopago: {
    title: 'MercadoPago',
    hint: 'Tarjeta, débito o crédito. Te redirigimos a pagar.',
  },
  transfer: {
    title: 'Transferencia',
    hint: 'Te pasamos los datos bancarios y subís el comprobante.',
  },
  cash: {
    title: 'Efectivo',
    hint: 'Pagás al recibir el pedido.',
  },
};

/**
 * Fila de producto igual a las de /menu (tarjeta, título, precio e imagen a la
 * derecha) pero sin el botón `+`: en el checkout ya están agregados.
 */
function CartRow({ item }: { item: CartItem }) {
  const unit = unitPriceOf(item);
  const lineTotal = unit * item.quantity;
  const extrasText = item.extras.map((e) => e.name).join(' · ');

  return (
    <article className="card relative flex items-stretch gap-4 p-3">
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-1 pr-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg uppercase leading-tight tracking-wide text-ink-900">
            {item.name}
          </h3>
          <span className="inline-flex items-center rounded-md bg-black px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
            {item.quantity}×
          </span>
        </div>
        {extrasText && <p className="line-clamp-2 text-sm text-ink-800/60">{extrasText}</p>}
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-xl leading-none text-black">
            {formatPrice(lineTotal)}
          </span>
          {item.quantity > 1 && (
            <span className="text-xs text-ink-800/40">{formatPrice(unit)} c/u</span>
          )}
        </div>
      </div>

      <div className="relative w-28 shrink-0 self-center sm:w-32">
        <img
          src={item.image || '/images/menu/default.svg'}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = '/images/menu/default.svg';
          }}
          className="h-28 w-28 rounded-xl object-cover sm:h-32 sm:w-32"
        />
      </div>
    </article>
  );
}

export default function CheckoutView({ zones, freeFrom, payments }: Props) {
  const { items } = useCart();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>(
    zones.length > 0 ? 'delivery' : 'pickup'
  );
  const [address, setAddress] = useState('');
  const [zone, setZone] = useState(zones[0]?.name ?? '');
  const [payment, setPayment] = useState<PaymentMethod>(
    payments.mercadopago ? 'mercadopago' : payments.transfer ? 'transfer' : 'cash'
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = useMemo(() => cartSubtotal(items), [items]);

  const deliveryCost = useMemo(() => {
    if (fulfillment !== 'delivery') return 0;
    const match = zones.find((z) => z.name === zone);
    const base = match ? match.cost : 0;
    return freeFrom > 0 && subtotal >= freeFrom ? 0 : base;
  }, [fulfillment, zone, zones, subtotal, freeFrom]);

  const total = subtotal + deliveryCost;

  if (items.length === 0) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <h2 className="font-display text-2xl uppercase text-ink-800">Tu carrito está vacío</h2>
        <p className="mt-1 text-sm text-ink-800/60">Agregá productos de la carta para continuar.</p>
        <a href="/" className="btn-primary mt-5">Ver la carta</a>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name, phone, email: email || undefined },
          fulfillment,
          address: fulfillment === 'delivery' ? address : undefined,
          zone: fulfillment === 'delivery' ? zone : undefined,
          paymentMethod: payment,
          notes: notes || undefined,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            extrasIds: item.extras.map((e) => e.id),
          })),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        redirect?: string;
        orderId?: string;
        error?: string;
      };
      if (!response.ok || !data.redirect) {
        setError(data.error ?? 'No pudimos procesar tu pedido. Probá de nuevo.');
        return;
      }
      clearCart();
      if (data.orderId) saveLastOrder(data.orderId);
      window.location.href = data.redirect;
    } catch {
      setError('Error de conexión. Probá de nuevo en unos segundos.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-32">
      <section aria-label="Productos del pedido" className="flex flex-col gap-4">
        {items.map((item) => (
          <CartRow key={item.key} item={item} />
        ))}
      </section>

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <section className="card p-5">
          <h2 className="mb-4 font-display text-xl uppercase text-ink-800">Tus datos</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Nombre y apellido *</span>
              <input
                required
                minLength={2}
                maxLength={100}
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Teléfono / WhatsApp *</span>
              <input
                required
                minLength={5}
                maxLength={30}
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Email (opcional)</span>
              <input
                type="email"
                maxLength={120}
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-display text-xl uppercase text-ink-800">Entrega</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setFulfillment('delivery')}
              disabled={zones.length === 0}
              className={`rounded-xl border p-4 text-left transition disabled:opacity-50 ${
                fulfillment === 'delivery'
                  ? 'border-black bg-zinc-50 ring-1 ring-black'
                  : 'border-ink-800/15 hover:border-black'
              }`}
            >
              <span className="font-bold text-ink-800">Delivery</span>
              <span className="block text-xs text-ink-800/60">A tu puerta</span>
            </button>
            <button
              type="button"
              onClick={() => setFulfillment('pickup')}
              className={`rounded-xl border p-4 text-left transition ${
                fulfillment === 'pickup'
                  ? 'border-black bg-zinc-50 ring-1 ring-black'
                  : 'border-ink-800/15 hover:border-black'
              }`}
            >
              <span className="font-bold text-ink-800">Retiro en local</span>
              <span className="block text-xs text-ink-800/60">Sin costo de envío</span>
            </button>
          </div>

          {fulfillment === 'delivery' && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium">Dirección *</span>
                <input
                  required
                  minLength={5}
                  maxLength={200}
                  className="input"
                  placeholder="Calle, número, piso/depto"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  autoComplete="street-address"
                />
              </label>
              {zones.length > 0 && (
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Zona *</span>
                  <select required className="input" value={zone} onChange={(e) => setZone(e.target.value)}>
                    {zones.map((z) => (
                      <option key={z.name} value={z.name}>
                        {z.name} — {z.cost > 0 ? formatPrice(z.cost) : 'gratis'}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-display text-xl uppercase text-ink-800">Pago</h2>
          <div className="space-y-2">
            {(Object.keys(PAYMENT_LABELS) as PaymentMethod[])
              .filter((method) => payments[method])
              .map((method) => (
                <label
                  key={method}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                    payment === method
                      ? 'border-black bg-zinc-50 ring-1 ring-black'
                      : 'border-ink-800/15 hover:border-black'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    className="h-4 w-4 accent-black"
                    checked={payment === method}
                    onChange={() => setPayment(method)}
                  />
                  <span>
                    <span className="block font-bold text-ink-800">{PAYMENT_LABELS[method].title}</span>
                    <span className="block text-xs text-ink-800/60">{PAYMENT_LABELS[method].hint}</span>
                  </span>
                </label>
              ))}
          </div>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium">Aclaraciones (opcional)</span>
            <textarea
              maxLength={500}
              rows={2}
              className="input resize-none"
              placeholder="Ej: sin cebolla, timbre roto, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </section>
      </div>

      {/* Barra flotante de compra (estilo footer de la página de producto) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-800/10 bg-white/95 p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur">
        <p className="mb-2 text-center text-[11px] leading-tight text-ink-800/40">
          Al confirmar aceptás los términos del pedido. Te contactamos por WhatsApp ante cualquier cambio.
        </p>
        <button type="submit" disabled={submitting} className="btn-primary w-full py-4 text-lg">
          {submitting ? 'Procesando…' : `Comprar - ${formatPrice(total)}`}
        </button>
      </div>
    </form>
  );
}
