import React, { useState, useMemo, useEffect } from 'react';
import type { Product, Extra } from '../../lib/d1';
import { addToCart } from '../../lib/cart';
import { formatPrice, parseImages, coverOf } from '../../lib/utils';
import { isFavorite, toggleFavorite } from '../../lib/favorites';

interface ModifierGroup {
  id: string;
  name: string;
  is_required: boolean;
  max_selection: number | null;
  options: Extra[];
}

interface ProductDetailViewProps {
  product: Product;
  extras: Extra[];
  basePrice: number;
  originalPrice?: number;
  discountPct?: number;
}

export default function ProductDetailView({
  product,
  extras,
  basePrice,
  originalPrice = basePrice,
  discountPct = 0,
}: ProductDetailViewProps) {
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, number | number[]>>({});
  const [added, setAdded] = useState(false);
  const [favorite, setFavorite] = useState(false);

  const image = coverOf(parseImages(product.images), product.cover_index);
  const soldOut = product.disponible === 0;
  const hasPromo = discountPct > 0;

  // El estado de favoritos vive en localStorage: se lee en el cliente para
  // no divergir del HTML del servidor.
  useEffect(() => {
    setFavorite(isFavorite(product.id));
  }, [product.id]);

  const goBack = () => {
    const ref = document.referrer;
    let sameOrigin = false;
    try {
      sameOrigin = !!ref && new URL(ref).origin === window.location.origin;
    } catch {
      sameOrigin = false;
    }
    if (sameOrigin) window.history.back();
    else window.location.href = '/menu';
  };

  const onToggleFavorite = () => setFavorite(toggleFavorite(product.id));

  // Virtual Grouping Logic
  const modifierGroups = useMemo((): ModifierGroup[] => {
    const groupsMap: Record<string, any> = {};

    extras.forEach(extra => {
      const groupId = extra.group_id || 'global';
      if (!groupsMap[groupId]) {
        groupsMap[groupId] = {
          id: groupId,
          name: groupId === 'global' ? 'Extras' : groupId.replace('_', ' ').toUpperCase(),
          is_required: extra.is_required === 1,
          max_selection: extra.max_selection,
          options: []
        };
      }
      groupsMap[groupId].options.push(extra);
    });

    return Object.values(groupsMap);
  }, [extras]);

  const totalPrice = useMemo(() => {
    let extraSum = 0;
    Object.values(selections).forEach(val => {
      const ids = Array.isArray(val) ? val : [val];
      ids.forEach(id => {
        const extra = extras.find(e => e.id === id);
        if (extra) extraSum += extra.price;
      });
    });
    return (basePrice + extraSum) * quantity;
  }, [selections, quantity, extras, basePrice]);

  const handleSelection = (groupId: string, extraId: number, maxSelection: number | null) => {
    setSelections(prev => {
      const current = prev[groupId];
      if (maxSelection === 1) {
        return { ...prev, [groupId]: extraId };
      } else {
        const selected = Array.isArray(current) ? [...current] : current ? [current] : [];
        if (selected.includes(extraId)) {
          return { ...prev, [groupId]: selected.filter(id => id !== extraId) };
        } else {
          return { ...prev, [groupId]: [...selected, extraId] };
        }
      }
    });
  };

  const isAddingDisabled = useMemo(() => {
    return modifierGroups.some(group => group.is_required && !selections[group.id]);
  }, [modifierGroups, selections]);

  const handleAddToCart = () => {
    const selectedExtras = extras.filter((extra) => {
      const value = selections[extra.group_id || 'global'];
      return Array.isArray(value) ? value.includes(extra.id) : value === extra.id;
    });

    addToCart(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image,
        basePrice,
      },
      selectedExtras.map((extra) => ({ id: extra.id, name: extra.name, price: extra.price })),
      quantity
    );

    setAdded(true);
  };

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1600);
    return () => clearTimeout(timer);
  }, [added]);

  return (
    <div className="relative flex flex-col min-h-screen bg-white pb-28">
      {/* Hero Section */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-zinc-900">
        <img src={image} alt={product.name} className="w-full h-full object-cover" />

        {/* Acciones sobre la imagen destacada: transparentes y con scroll */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
          <button
            type="button"
            onClick={goBack}
            aria-label="Volver"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-md backdrop-blur transition hover:bg-white active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={favorite}
            aria-label={favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-md backdrop-blur transition hover:bg-white active:scale-95"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              strokeWidth="2"
              aria-hidden="true"
              className={favorite ? 'fill-rose-500 stroke-rose-500' : 'fill-transparent stroke-current'}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-center gap-2 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
          {hasPromo && (
            <span className="rounded-full bg-[#F2AB27] px-2.5 py-1 text-xs font-bold text-ink-900">
              {discountPct}% OFF
            </span>
          )}
          {product.destacado === 1 && (
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold ring-1 ring-white/40 backdrop-blur">
              Más vendido
            </span>
          )}
          {soldOut && (
            <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold ring-1 ring-white/30">
              Agotado
            </span>
          )}
        </div>
      </div>

      {/* Product Info */}
      <section className="p-4 flex flex-col gap-3">
        <h1 className="text-2xl font-extrabold leading-tight text-ink-900">{product.name}</h1>
        <p className="text-sm text-zinc-500 leading-relaxed">{product.description}</p>
        <div className="mt-2 flex items-baseline gap-3">
          {hasPromo && (
            <span className="text-sm text-zinc-400 line-through">{formatPrice(originalPrice)}</span>
          )}
          <span className="text-2xl font-extrabold text-ink-900">{formatPrice(basePrice)}</span>
        </div>
      </section>

      {/* Modifiers */}
      <section className="px-4 pb-32">
        {modifierGroups.map(group => (
          <div key={group.id} className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-bold text-ink-900">{group.name}</h3>
                {group.is_required && <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-zinc-200 rounded-full text-zinc-600">Requerido</span>}
              </div>
              <span className="text-xs text-zinc-400">{group.max_selection === 1 ? 'Elige 1 opción' : 'Opcionales'}</span>
            </div>
            <div className="flex flex-col gap-2">
              {group.options.map(option => {
                const current = selections[group.id];
                const isSelected = Array.isArray(current)
                  ? current.includes(option.id)
                  : current === option.id;
                return (
                  <div 
                    key={option.id} 
                    onClick={() => handleSelection(group.id, option.id, group.max_selection)}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${isSelected ? 'border-brand-500 bg-brand-50' : 'border-zinc-100 bg-white'}`}
                  >
                    <span className="text-sm font-medium text-ink-800">{option.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-ink-900">+ ${option.price}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-brand-500 bg-brand-500' : 'border-zinc-300'}`}>
                        {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Purchase Bar */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-zinc-100 shadow-lg z-50 pb-safe">
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold text-ink-900">Tu producto</span>
          <span className="text-xl font-extrabold text-ink-900">{formatPrice(totalPrice)}</span>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center bg-zinc-100 rounded-full p-1 h-12">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center font-bold text-ink-900">-</button>
            <span className="w-8 text-center font-bold">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center font-bold text-ink-900">+</button>
          </div>
          <button 
            disabled={isAddingDisabled || soldOut}
            onClick={handleAddToCart}
            className={`flex-1 h-12 rounded-full font-bold text-white transition-all ${isAddingDisabled || soldOut ? 'bg-zinc-300 cursor-not-allowed' : added ? 'bg-green-600' : 'bg-brand-600 hover:bg-brand-700'}`}
          >
            {added ? '✓ Agregado' : soldOut ? 'Agotado' : 'Agregar'}
          </button>
        </div>
      </footer>
    </div>
  );
}
