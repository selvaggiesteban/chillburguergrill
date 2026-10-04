import { useCallback, useEffect, useState } from 'react';
import {
  getLastOrderId,
  getSeen,
  isOrderUnread,
  markNoticesSeen,
  markOrderSeen,
  relativeTime,
  STATUS_LABELS,
  STATUS_STYLES,
  unreadNotices,
  type Notice,
  type OrderStatusInfo,
} from '../../lib/notifications';

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(path, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [order, setOrder] = useState<OrderStatusInfo | null>(null);
  const [orderGone, setOrderGone] = useState(false);
  const [seenAt, setSeenAt] = useState(0);
  const [seenOrder, setSeenOrder] = useState<{ id: string; status: string } | undefined>(undefined);

  const load = useCallback(async () => {
    const orderId = getLastOrderId();
    const seen = getSeen();
    setSeenAt(seen.noticesAt ?? 0);
    setSeenOrder(seen.order);

    const [noticeData, orderData] = await Promise.all([
      fetchJson<{ notices?: Notice[] }>('/api/noticias'),
      orderId ? fetchJson<OrderStatusInfo & { error?: string }>(`/api/pedido/${orderId}`) : null,
    ]);

    setNotices(noticeData?.notices ?? []);
    if (orderId) {
      if (orderData?.id) setOrder(orderData);
      else setOrderGone(true);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Refresca el estado del pedido cada minuto mientras la pestaña esté visible.
  useEffect(() => {
    const orderId = getLastOrderId();
    if (!orderId) return;
    const tick = async () => {
      if (document.visibilityState !== 'visible') return;
      const data = await fetchJson<OrderStatusInfo>(`/api/pedido/${orderId}`);
      if (data?.id) setOrder(data);
    };
    const timer = window.setInterval(() => void tick(), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const unreadCount = ready
    ? unreadNotices(notices, { noticesAt: seenAt, order: seenOrder }) +
      (order && isOrderUnread(order, { noticesAt: seenAt, order: seenOrder }) ? 1 : 0)
    : 0;

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      markNoticesSeen();
      setSeenAt(Date.now());
      if (order) {
        markOrderSeen(order.id, order.status);
        setSeenOrder({ id: order.id, status: order.status });
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="relative rounded-xl p-2 text-white transition hover:bg-white/15"
        aria-label={unreadCount > 0 ? `Notificaciones (${unreadCount} nuevas)` : 'Notificaciones'}
        aria-expanded={open}
      >
        <BellIcon />
        {ready && unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold leading-none text-ink-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Notificaciones">
          <button
            type="button"
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Cerrar notificaciones"
          />
          <div className="absolute right-2 top-16 max-h-[75vh] w-[min(22rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-ink-800/10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl uppercase text-ink-800">Notificaciones</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-ink-800/60 transition hover:bg-ink-800/5 hover:text-ink-800"
                aria-label="Cerrar"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <section className="mb-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-800/50">Novedades</h3>
              {notices.length === 0 ? (
                <p className="text-sm text-ink-800/60">No hay novedades por ahora.</p>
              ) : (
                <ul className="space-y-2">
                  {notices.map((notice) => (
                    <li key={notice.id} className="rounded-xl bg-paper p-3 ring-1 ring-ink-800/5">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-semibold text-ink-800">{notice.title}</p>
                        <span className="shrink-0 text-xs text-ink-800/50">{relativeTime(notice.createdAt)}</span>
                      </div>
                      {notice.body && <p className="mt-1 text-sm text-ink-800/70">{notice.body}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-800/50">Tu pedido</h3>
              {!getLastOrderId() ? (
                <p className="text-sm text-ink-800/60">
                  Todavía no hiciste pedidos desde este dispositivo. Cuando hagas uno vas a poder seguirlo acá.
                </p>
              ) : orderGone && !order ? (
                <p className="text-sm text-ink-800/60">No pudimos encontrar ese pedido.</p>
              ) : !order ? (
                <p className="text-sm text-ink-800/60">Consultando estado…</p>
              ) : (
                <div className="rounded-xl bg-paper p-3 ring-1 ring-ink-800/5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-800">Pedido #{order.shortId}</p>
                    <span className={`badge ${STATUS_STYLES[order.status] ?? 'bg-ink-800/10 text-ink-800 ring-ink-800/20'}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-800/60">
                    {order.fulfillment === 'delivery' ? 'Delivery' : 'Retiro en el local'}
                    {order.updatedAt ? ` · actualizado ${relativeTime(order.updatedAt)}` : ''}
                  </p>
                  <a
                    href={`/pedido/${order.id}`}
                    onClick={() => setOpen(false)}
                    className="mt-2 inline-flex text-sm font-semibold text-brand-600 transition hover:text-brand-700"
                  >
                    Ver detalle del pedido →
                  </a>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
