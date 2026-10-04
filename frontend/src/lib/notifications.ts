/**
 * Notificaciones del cliente (navegador): último pedido + novedades del local.
 *
 * Todo vive en localStorage: no hay cuentas de usuario, así que el "estado de
 * mi pedido" se asocia al dispositivo desde el que se hizo el checkout.
 */
export type Notice = {
  id: string;
  title: string;
  body?: string;
  createdAt: string;
  active?: boolean;
};

export type OrderStatusInfo = {
  id: string;
  shortId: string;
  status: string;
  paymentStatus: string;
  fulfillment: 'delivery' | 'pickup';
  updatedAt: string;
};

export type SeenState = {
  noticesAt?: number;
  order?: { id: string; status: string };
};

const LAST_ORDER_KEY = 'chill:last-order';
const SEEN_KEY = 'chill:notifications-seen';

export const STATUS_LABELS: Record<string, string> = {
  new: 'Recibido',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo para enviar',
  on_the_way: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 ring-blue-200',
  confirmed: 'bg-blue-100 text-blue-800 ring-blue-200',
  preparing: 'bg-amber-100 text-amber-800 ring-amber-200',
  ready: 'bg-green-100 text-green-800 ring-green-200',
  on_the_way: 'bg-green-100 text-green-800 ring-green-200',
  delivered: 'bg-ink-800/10 text-ink-800 ring-ink-800/20',
  cancelled: 'bg-red-100 text-red-800 ring-red-200',
};

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage lleno o bloqueado: no es crítico */
  }
}

/** Guarda el pedido recién creado para poder seguirlo desde la campana. */
export function saveLastOrder(id: string): void {
  writeJson(LAST_ORDER_KEY, { id, at: Date.now() });
}

export function getLastOrderId(): string | null {
  const raw = readJson<{ id?: string }>(LAST_ORDER_KEY);
  return raw?.id ?? null;
}

export function clearLastOrder(): void {
  try {
    window.localStorage.removeItem(LAST_ORDER_KEY);
  } catch {
    /* noop */
  }
}

export function getSeen(): SeenState {
  return readJson<SeenState>(SEEN_KEY) ?? {};
}

export function markNoticesSeen(): void {
  writeJson(SEEN_KEY, { ...getSeen(), noticesAt: Date.now() });
}

export function markOrderSeen(id: string, status: string): void {
  writeJson(SEEN_KEY, { ...getSeen(), order: { id, status } });
}

/** Cuántas novedades nuevas hay respecto de la última vez que se abrió la campana. */
export function unreadNotices(notices: Notice[], seen: SeenState): number {
  const since = seen.noticesAt ?? 0;
  return notices.filter((n) => Date.parse(n.createdAt || '') > since).length;
}

/** El estado del pedido cambió desde la última visita. */
export function isOrderUnread(info: OrderStatusInfo, seen: SeenState): boolean {
  if (seen.order?.id !== info.id) return true;
  return seen.order.status !== info.status;
}

/** "hace 5 min" / "ayer" — fechas cortas para la lista de novedades. */
export function relativeTime(iso: string): string {
  let raw = (iso ?? '').trim();
  if (!raw) return '';
  // D1 guarda `datetime('now')` en UTC sin timezone: lo tratamos como UTC.
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(raw)) raw = `${raw.replace(' ', 'T')}Z`;
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return '';
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  return new Date(ts).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}
