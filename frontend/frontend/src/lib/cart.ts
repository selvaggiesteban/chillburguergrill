/**
 * Store del carrito: módulo singleton con suscriptores (useSyncExternalStore).
 *
 * - 100% cliente: persiste en localStorage (clave versionada).
 * - SSR-safe: en servidor el snapshot es siempre vacío (getServerSnapshot).
 * - Inmutable: cada mutación produce un snapshot nuevo (React lo detecta).
 * - Sincronización entre pestañas vía el evento `storage`.
 */
import { useSyncExternalStore } from 'react';

export type CartExtra = { id: number; name: string; price: number };

export type CartItem = {
  key: string;
  productId: number;
  slug: string;
  name: string;
  image: string;
  basePrice: number;
  quantity: number;
  extras: CartExtra[];
};

export type CartSnapshot = { items: CartItem[] };

export type CartProductInput = {
  productId: number;
  slug: string;
  name: string;
  image: string;
  basePrice: number;
};

const STORAGE_KEY = 'chill-cart-v1';
const MAX_QTY_PER_LINE = 99;

const EMPTY: CartSnapshot = { items: [] };

let snapshot: CartSnapshot = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function emit(): void {
  snapshot = { items: [...snapshot.items] };
  for (const listener of listeners) listener();
}

function itemKey(productId: number, extras: CartExtra[]): string {
  const ids = extras.map((e) => e.id).sort((a, b) => a - b);
  return ids.length > 0 ? `${productId}:${ids.join('-')}` : `${productId}`;
}

function sanitizeItem(raw: unknown): CartItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.productId !== 'number' || typeof r.name !== 'string') return null;
  const extras: CartExtra[] = Array.isArray(r.extras)
    ? r.extras
        .filter((e): e is CartExtra => !!e && typeof e === 'object' && typeof (e as CartExtra).id === 'number')
        .map((e) => ({ id: e.id, name: String(e.name ?? ''), price: Number(e.price) || 0 }))
    : [];
  const quantity = Math.min(Math.max(Math.trunc(Number(r.quantity) || 1), 1), MAX_QTY_PER_LINE);
  return {
    key: itemKey(r.productId, extras),
    productId: r.productId,
    slug: typeof r.slug === 'string' ? r.slug : '',
    name: r.name,
    image: typeof r.image === 'string' ? r.image : '',
    basePrice: Number(r.basePrice) || 0,
    quantity,
    extras,
  };
}

function loadFromStorage(): void {
  if (loaded) return;
  loaded = true;
  if (typeof window === 'undefined') return;
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    loaded = false;
    loadFromStorage();
    emit();
  });
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { items?: unknown };
    const items = (Array.isArray(parsed?.items) ? parsed.items : [])
      .map(sanitizeItem)
      .filter((item): item is CartItem => item !== null);
    snapshot = { items };
  } catch {
    snapshot = EMPTY;
  }
}

function persist(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: snapshot.items }));
  } catch {
    /* cuota llena o modo privado: el carrito sigue vivo en memoria */
  }
}

// ------------------------------------------------------------------
// API del store (mundo cliente)
// ------------------------------------------------------------------

export function subscribeCart(callback: () => void): () => void {
  listeners.add(callback);
  loadFromStorage();
  return () => {
    listeners.delete(callback);
  };
}

export function getCartSnapshot(): CartSnapshot {
  return snapshot;
}

export function getServerCartSnapshot(): CartSnapshot {
  return EMPTY;
}

export function addToCart(product: CartProductInput, extras: CartExtra[], quantity = 1): void {
  loadFromStorage();
  const key = itemKey(product.productId, extras);
  const existing = snapshot.items.find((i) => i.key === key);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, MAX_QTY_PER_LINE);
  } else {
    snapshot.items.push({
      key,
      productId: product.productId,
      slug: product.slug,
      name: product.name,
      image: product.image,
      basePrice: product.basePrice,
      quantity: Math.min(Math.max(quantity, 1), MAX_QTY_PER_LINE),
      extras: extras.map((e) => ({ ...e })),
    });
  }
  persist();
  emit();
}

export function setItemQuantity(key: string, quantity: number): void {
  loadFromStorage();
  const index = snapshot.items.findIndex((i) => i.key === key);
  if (index === -1) return;
  if (quantity <= 0) {
    snapshot.items.splice(index, 1);
  } else {
    snapshot.items[index] = {
      ...snapshot.items[index],
      quantity: Math.min(quantity, MAX_QTY_PER_LINE),
    };
  }
  persist();
  emit();
}

export function removeFromCart(key: string): void {
  setItemQuantity(key, 0);
}

export function clearCart(): void {
  loadFromStorage();
  if (snapshot.items.length === 0) return;
  snapshot = EMPTY;
  persist();
  emit();
}

// ------------------------------------------------------------------
// Selectores puros (también usados por SSR pages / checkout)
// ------------------------------------------------------------------

export function unitPriceOf(item: Pick<CartItem, 'basePrice' | 'extras'>): number {
  return item.basePrice + item.extras.reduce((sum, extra) => sum + extra.price, 0);
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + unitPriceOf(item) * item.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

// ------------------------------------------------------------------
// Hooks React
// ------------------------------------------------------------------

export function useCart(): CartSnapshot {
  return useSyncExternalStore(subscribeCart, getCartSnapshot, getServerCartSnapshot);
}

export function useCartCount(): number {
  return cartCount(useCart().items);
}

export function useCartSubtotal(): number {
  return cartSubtotal(useCart().items);
}
