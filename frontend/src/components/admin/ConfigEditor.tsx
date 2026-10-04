import { useEffect, useState } from 'react';

type Contact = {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  address_url: string;
  instagram: string;
};
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type DayKey = (typeof DAY_KEYS)[number];
type DayHours = { closed: boolean; open: string; close: string };
type Hours = { days: Record<DayKey, DayHours> };
type Delivery = { zones: { name: string; cost: number }[]; free_from: number };
type Bank = { alias: string; cbu: string; titular: string };
type Payments = { mercadopago: boolean; transfer: boolean; cash: boolean };
type NoticeItem = { id: string; title: string; body: string; createdAt: string; active: boolean };

type Config = {
  contact: Contact;
  hours: Hours;
  delivery: Delivery;
  bank: Bank;
  payments: Payments;
  notices: NoticeItem[];
};

const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo',
};

const DEFAULT_DAY: DayHours = { closed: false, open: '20:00', close: '23:50' };

function daysMap(build: (key: DayKey) => DayHours): Record<DayKey, DayHours> {
  const out = {} as Record<DayKey, DayHours>;
  for (const key of DAY_KEYS) out[key] = build(key);
  return out;
}

const EMPTY: Config = {
  contact: { phone: '', whatsapp: '', email: '', address: '', address_url: '', instagram: '' },
  hours: {
    days: daysMap((key) => ({
      ...DEFAULT_DAY,
      closed: key === 'mon' || key === 'tue' || key === 'wed',
    })),
  },
  delivery: { zones: [], free_from: 0 },
  bank: { alias: '', cbu: '', titular: '' },
  payments: { mercadopago: true, transfer: true, cash: true },
  notices: [],
};

function normalizeNotices(raw: unknown): NoticeItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((n): n is Record<string, unknown> => !!n && typeof n === 'object')
    .map((n) => ({
      id: typeof n.id === 'string' && n.id ? n.id : crypto.randomUUID(),
      title: typeof n.title === 'string' ? n.title : '',
      body: typeof n.body === 'string' ? n.body : '',
      createdAt: typeof n.createdAt === 'string' ? n.createdAt : new Date().toISOString(),
      active: n.active !== false,
    }));
}

/** Acepta el formato por día y el legado (rango por grupo de días). */
function normalizeHours(raw: unknown): Hours {
  const source = (raw ?? {}) as {
    days?: Partial<Record<DayKey, Partial<DayHours>>>;
    mon_to_thu?: string;
    fri_sat?: string;
    sun?: string;
  };
  const days = daysMap((key) =>
    source.days?.[key] ? { ...DEFAULT_DAY, ...source.days[key] } : { ...DEFAULT_DAY, closed: true }
  );

  if (source.days) return { days };

  const applyLegacy = (value: string | undefined, keys: DayKey[]) => {
    const match = (value ?? '').trim().match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
    for (const key of keys) {
      days[key] = match ? { closed: false, open: match[1], close: match[2] } : { ...DEFAULT_DAY, closed: true };
    }
  };
  applyLegacy(source.mon_to_thu, ['mon', 'tue', 'wed', 'thu']);
  applyLegacy(source.fri_sat, ['fri', 'sat']);
  applyLegacy(source.sun, ['sun']);
  return { days };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export default function ConfigEditor() {
  const [config, setConfig] = useState<Config>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/config')
      .then((r) => r.json() as Promise<{ config?: Partial<Config> }>)
      .then((data) => {
        const c = data.config ?? {};
        setConfig({
          contact: { ...EMPTY.contact, ...(c.contact ?? {}) },
          hours: normalizeHours(c.hours),
          delivery: { ...EMPTY.delivery, ...(c.delivery ?? {}) },
          bank: { ...EMPTY.bank, ...(c.bank ?? {}) },
          payments: { ...EMPTY.payments, ...(c.payments ?? {}) },
          notices: normalizeNotices(c.notices),
        });
      })
      .catch(() => setMessage({ kind: 'error', text: 'No se pudo cargar la configuración' }))
      .finally(() => setLoading(false));
  }, []);

  const save = async (key: keyof Config) => {
    setSavingKey(key);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: config[key] }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'No se pudo guardar');
      setMessage({ kind: 'ok', text: 'Guardado ✓' });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Error' });
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <p className="card p-8 text-center text-slate-500">Cargando configuración…</p>;

  const zoneErrors = config.delivery.zones.some((z) => !z.name.trim() || Number.isNaN(z.cost));
  const noticeErrors = config.notices.some((n) => !n.title.trim());

  return (
    <div className="max-w-3xl space-y-5">
      {message && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            message.kind === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </p>
      )}

      <section className="card p-5">
        <h2 className="mb-4 font-display text-xl uppercase text-slate-800">Contacto</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Teléfono">
            <input className="input" value={config.contact.phone} onChange={(e) => setConfig({ ...config, contact: { ...config.contact, phone: e.target.value } })} />
          </Field>
          <Field label="WhatsApp">
            <input className="input" value={config.contact.whatsapp} onChange={(e) => setConfig({ ...config, contact: { ...config.contact, whatsapp: e.target.value } })} />
          </Field>
          <Field label="Email">
            <input className="input" value={config.contact.email} onChange={(e) => setConfig({ ...config, contact: { ...config.contact, email: e.target.value } })} />
          </Field>
          <Field label="Dirección">
            <input className="input" value={config.contact.address} onChange={(e) => setConfig({ ...config, contact: { ...config.contact, address: e.target.value } })} />
          </Field>
          <Field label="Link del mapa (Google Maps)">
            <input className="input" placeholder="https://maps.app.goo.gl/…" value={config.contact.address_url} onChange={(e) => setConfig({ ...config, contact: { ...config.contact, address_url: e.target.value } })} />
          </Field>
          <Field label="Instagram">
            <input className="input" value={config.contact.instagram} onChange={(e) => setConfig({ ...config, contact: { ...config.contact, instagram: e.target.value } })} />
          </Field>
        </div>
        <button type="button" disabled={savingKey === 'contact'} onClick={() => void save('contact')} className="btn-primary mt-4 px-4 py-2 text-sm">
          {savingKey === 'contact' ? 'Guardando…' : 'Guardar contacto'}
        </button>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-display text-xl uppercase text-slate-800">Horarios</h2>
        <div className="space-y-2">
          {DAY_KEYS.map((key) => {
            const day = config.hours.days[key];
            return (
              <div key={key} className="flex flex-wrap items-center gap-3">
                <label className="flex w-40 items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={!day.closed}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        hours: {
                          days: { ...config.hours.days, [key]: { ...day, closed: !e.target.checked } },
                        },
                      })
                    }
                  />
                  {DAY_LABELS[key]}
                </label>
                <input
                  type="time"
                  className="input w-32"
                  disabled={day.closed}
                  value={day.open}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      hours: { days: { ...config.hours.days, [key]: { ...day, open: e.target.value } } },
                    })
                  }
                />
                <span className="text-sm text-slate-400">a</span>
                <input
                  type="time"
                  className="input w-32"
                  disabled={day.closed}
                  value={day.close}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      hours: { days: { ...config.hours.days, [key]: { ...day, close: e.target.value } } },
                    })
                  }
                />
                {day.closed && <span className="text-sm font-medium text-slate-400">Cerrado</span>}
              </div>
            );
          })}
        </div>
        <button type="button" disabled={savingKey === 'hours'} onClick={() => void save('hours')} className="btn-primary mt-4 px-4 py-2 text-sm">
          {savingKey === 'hours' ? 'Guardando…' : 'Guardar horarios'}
        </button>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-display text-xl uppercase text-slate-800">Delivery</h2>
        <div className="space-y-2">
          {config.delivery.zones.map((zone, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                className="input"
                placeholder="Zona (ej: Centro)"
                value={zone.name}
                onChange={(e) => {
                  const zones = config.delivery.zones.map((z, i) => (i === index ? { ...z, name: e.target.value } : z));
                  setConfig({ ...config, delivery: { ...config.delivery, zones } });
                }}
              />
              <input
                type="number"
                min={0}
                className="input w-32"
                placeholder="Costo"
                value={zone.cost}
                onChange={(e) => {
                  const zones = config.delivery.zones.map((z, i) => (i === index ? { ...z, cost: Number(e.target.value) } : z));
                  setConfig({ ...config, delivery: { ...config.delivery, zones } });
                }}
              />
              <button
                type="button"
                className="btn-ghost px-2 text-red-500"
                onClick={() => {
                  const zones = config.delivery.zones.filter((_, i) => i !== index);
                  setConfig({ ...config, delivery: { ...config.delivery, zones } });
                }}
                aria-label="Quitar zona"
              >
                ✕
              </button>
            </div>
          ))}
          {config.delivery.zones.length === 0 && <p className="text-sm text-slate-400">Sin zonas: el pedido por delivery no tendrá costo de envío.</p>}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <button
            type="button"
            className="btn-secondary px-4 py-2 text-sm"
            onClick={() =>
              setConfig({
                ...config,
                delivery: { ...config.delivery, zones: [...config.delivery.zones, { name: '', cost: 0 }] },
              })
            }
          >
            + Agregar zona
          </button>
          <Field label="Envío gratis desde">
            <input
              type="number"
              min={0}
              className="input w-40"
              value={config.delivery.free_from}
              onChange={(e) => setConfig({ ...config, delivery: { ...config.delivery, free_from: Number(e.target.value) } })}
            />
          </Field>
        </div>
        <button
          type="button"
          disabled={savingKey === 'delivery' || zoneErrors}
          onClick={() => void save('delivery')}
          className="btn-primary mt-4 px-4 py-2 text-sm"
        >
          {savingKey === 'delivery' ? 'Guardando…' : 'Guardar delivery'}
        </button>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-display text-xl uppercase text-slate-800">Cuenta bancaria (transferencias)</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Alias">
            <input className="input" value={config.bank.alias} onChange={(e) => setConfig({ ...config, bank: { ...config.bank, alias: e.target.value } })} />
          </Field>
          <Field label="CBU">
            <input className="input" value={config.bank.cbu} onChange={(e) => setConfig({ ...config, bank: { ...config.bank, cbu: e.target.value } })} />
          </Field>
          <Field label="Titular">
            <input className="input" value={config.bank.titular} onChange={(e) => setConfig({ ...config, bank: { ...config.bank, titular: e.target.value } })} />
          </Field>
        </div>
        <button type="button" disabled={savingKey === 'bank'} onClick={() => void save('bank')} className="btn-primary mt-4 px-4 py-2 text-sm">
          {savingKey === 'bank' ? 'Guardando…' : 'Guardar cuenta'}
        </button>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-display text-xl uppercase text-slate-800">Métodos de pago</h2>
        <div className="flex flex-wrap gap-4 text-sm font-medium">
          {(
            [
              ['mercadopago', 'MercadoPago'],
              ['transfer', 'Transferencia'],
              ['cash', 'Efectivo'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.payments[key]}
                onChange={(e) => setConfig({ ...config, payments: { ...config.payments, [key]: e.target.checked } })}
              />
              {label}
            </label>
          ))}
        </div>
        <button type="button" disabled={savingKey === 'payments'} onClick={() => void save('payments')} className="btn-primary mt-4 px-4 py-2 text-sm">
          {savingKey === 'payments' ? 'Guardando…' : 'Guardar pagos'}
        </button>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-display text-xl uppercase text-slate-800">Novedades</h2>
        <p className="mb-4 text-sm text-slate-500">
          Aparecen en la campana de notificaciones de la cabecera: promos, cambios de horario, avisos del local.
        </p>
        <div className="space-y-3">
          {config.notices.map((notice, index) => (
            <div key={notice.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start gap-2">
                <input
                  className="input"
                  placeholder="Título (ej: 2x1 los jueves)"
                  value={notice.title}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      notices: config.notices.map((n, i) => (i === index ? { ...n, title: e.target.value } : n)),
                    })
                  }
                />
                <button
                  type="button"
                  className="btn-ghost px-2 text-red-500"
                  onClick={() => setConfig({ ...config, notices: config.notices.filter((_, i) => i !== index) })}
                  aria-label="Quitar novedad"
                >
                  ✕
                </button>
              </div>
              <textarea
                className="input mt-2"
                rows={2}
                placeholder="Texto (opcional)"
                value={notice.body}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    notices: config.notices.map((n, i) => (i === index ? { ...n, body: e.target.value } : n)),
                  })
                }
              />
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={notice.active}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      notices: config.notices.map((n, i) => (i === index ? { ...n, active: e.target.checked } : n)),
                    })
                  }
                />
                Visible en la campana
                <span className="ml-auto text-xs text-slate-400">
                  {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString('es-AR') : ''}
                </span>
              </label>
            </div>
          ))}
          {config.notices.length === 0 && <p className="text-sm text-slate-400">Sin novedades publicadas.</p>}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            className="btn-secondary px-4 py-2 text-sm"
            onClick={() =>
              setConfig({
                ...config,
                notices: [
                  ...config.notices,
                  { id: crypto.randomUUID(), title: '', body: '', createdAt: new Date().toISOString(), active: true },
                ],
              })
            }
          >
            + Agregar novedad
          </button>
          <button
            type="button"
            disabled={savingKey === 'notices' || noticeErrors}
            onClick={() => void save('notices')}
            className="btn-primary px-4 py-2 text-sm"
          >
            {savingKey === 'notices' ? 'Guardando…' : 'Guardar novedades'}
          </button>
        </div>
      </section>
    </div>
  );
}
