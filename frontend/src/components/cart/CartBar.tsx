import { useEffect, useState } from 'react';
import {
  useCart,
  useCartSubtotal,
  setItemQuantity,
  removeFromCart,
  unitPriceOf,
} from '../../lib/cart';
import { formatPrice } from '../../lib/utils';

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

export default function CartBar() {
  const { items } = useCart();
  const subtotal = useCartSubtotal();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative rounded-xl p-2 text-ink-800 transition hover:bg-ink-800/5"
        aria-label={`Abrir carrito (${count} productos)`}
      >
        <CartIcon />
        {mounted && count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1 text-xs font-bold text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Carrito">
          <button
            type="button"
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Cerrar carrito"
          />
          <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-ink-800/10 px-5 py-4">
              <h2 className="font-display text-2xl uppercase text-ink-800">Tu pedido</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-ink-800/60 transition hover:bg-ink-800/5 hover:text-ink-800"
                aria-label="Cerrar"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <span className="text-5xl">🍔</span>
                  <p className="text-ink-800/60">Tu carrito está vacío</p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="btn-primary"
                  >
                    Ver la carta
                  </button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li key={item.key} className="flex gap-3 rounded-xl border border-ink-800/10 p-3">
                      <img
                        src={item.image}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-semibold text-ink-800">{item.name}</p>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.key)}
                            className="shrink-0 text-ink-800/40 transition hover:text-red-600"
                            aria-label={`Quitar ${item.name}`}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            </svg>
                          </button>
                        </div>
                        {item.extras.length > 0 && (
                          <p className="mt-0.5 truncate text-xs text-ink-800/50">
                            {item.extras.map((e) => e.name).join(' · ')}
                          </p>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1 rounded-lg border border-ink-800/15">
                            <button
                              type="button"
                              onClick={() => setItemQuantity(item.key, item.quantity - 1)}
                              className="px-2.5 py-1 text-ink-800/70 transition hover:text-brand-600"
                              aria-label="Restar uno"
                            >
                              −
                            </button>
                            <span className="min-w-[1.5rem] text-center text-sm font-bold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => setItemQuantity(item.key, item.quantity + 1)}
                              className="px-2.5 py-1 text-ink-800/70 transition hover:text-brand-600"
                              aria-label="Sumar uno"
                            >
                              +
                            </button>
                          </div>
                          <span className="font-bold text-ink-800">
                            {formatPrice(unitPriceOf(item) * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <footer className="border-t border-ink-800/10 px-5 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-ink-800/60">Subtotal</span>
                  <span className="font-display text-2xl text-ink-800">{formatPrice(subtotal)}</span>
                </div>
                <a
                  href="/checkout"
                  onClick={() => setOpen(false)}
                  className="btn-primary w-full"
                >
                  Finalizar pedido
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-ghost mt-1 w-full"
                >
                  Seguir comprando
                </button>
              </footer>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
