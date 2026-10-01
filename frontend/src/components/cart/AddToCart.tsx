import { useEffect, useMemo, useState } from 'react';
import { addToCart, type CartProductInput, type CartExtra } from '../../lib/cart';
import { formatPrice } from '../../lib/utils';

type ExtraOption = CartExtra;

type Props = {
  product: CartProductInput;
  extras?: ExtraOption[];
  /** Botón chico para tarjetas de la carta (sin selector de extras). */
  compact?: boolean;
};

export default function AddToCart({ product, extras = [], compact = false }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1600);
    return () => clearTimeout(t);
  }, [added]);

  const selectedExtras = useMemo(
    () => extras.filter((e) => selected.has(e.id)),
    [extras, selected]
  );

  const unitPrice = product.basePrice + selectedExtras.reduce((sum, e) => sum + e.price, 0);
  const total = unitPrice * quantity;

  const toggleExtra = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    addToCart(product, selectedExtras, quantity);
    setAdded(true);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAdd();
        }}
        className="btn-primary px-4 py-2 text-sm"
      >
        {added ? '✓ Agregado' : 'Agregar'}
      </button>
    );
  }

  return (
    <div className="space-y-5">
      {extras.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-800/50">
            Agregados
          </h3>
          <ul className="space-y-2">
            {extras.map((extra) => {
              const isActive = selected.has(extra.id);
              return (
                <li key={extra.id}>
                  <label
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${
                      isActive
                        ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                        : 'border-ink-800/15 bg-white hover:border-brand-400'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => toggleExtra(extra.id)}
                        className="h-4 w-4 accent-brand-600"
                      />
                      <span className="font-medium text-ink-800">{extra.name}</span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-ink-800/60">
                      {extra.price > 0 ? `+${formatPrice(extra.price)}` : 'Gratis'}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 rounded-xl border border-ink-800/15 bg-white">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="px-4 py-2.5 text-lg text-ink-800/70 transition hover:text-brand-600 disabled:opacity-30"
            aria-label="Restar uno"
          >
            −
          </button>
          <span className="min-w-[2rem] text-center font-bold">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            className="px-4 py-2.5 text-lg text-ink-800/70 transition hover:text-brand-600"
            aria-label="Sumar uno"
          >
            +
          </button>
        </div>

        <button type="button" onClick={handleAdd} className="btn-primary flex-1 py-3 text-lg">
          {added ? '✓ Agregado al carrito' : `Agregar · ${formatPrice(total)}`}
        </button>
      </div>
    </div>
  );
}
