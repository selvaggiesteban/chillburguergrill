import { useState } from 'react';

type Props = {
  orderId: string;
  status: string;
  paymentStatus: string;
};

const ORDER_STATUSES = [
  ['new', 'Nuevo'],
  ['confirmed', 'Confirmado'],
  ['preparing', 'En preparación'],
  ['ready', 'Listo'],
  ['on_the_way', 'En camino'],
  ['delivered', 'Entregado'],
  ['cancelled', 'Cancelado'],
] as const;

const PAYMENT_STATUSES = [
  ['pending', 'Pendiente'],
  ['processing', 'En proceso'],
  ['paid', 'Pagado'],
  ['rejected', 'Rechazado'],
  ['refunded', 'Reembolsado'],
] as const;

export default function OrderControls({ orderId, status, paymentStatus }: Props) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentPayment, setCurrentPayment] = useState(paymentStatus);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const save = async (patch: { status?: string; payment_status?: string }) => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'No se pudo actualizar');
      if (patch.status) setCurrentStatus(patch.status);
      if (patch.payment_status) setCurrentPayment(patch.payment_status);
      setMessage({ kind: 'ok', text: 'Actualizado ✓' });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Error inesperado' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
          Estado del pedido
        </label>
        <div className="flex gap-2">
          <select
            className="input"
            value={currentStatus}
            onChange={(e) => setCurrentStatus(e.target.value)}
          >
            {ORDER_STATUSES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={saving || currentStatus === status}
            onClick={() => void save({ status: currentStatus })}
            className="btn-primary shrink-0 px-4 text-sm"
          >
            Guardar
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
          Estado del pago
        </label>
        <div className="flex gap-2">
          <select
            className="input"
            value={currentPayment}
            onChange={(e) => setCurrentPayment(e.target.value)}
          >
            {PAYMENT_STATUSES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={saving || currentPayment === paymentStatus}
            onClick={() => void save({ payment_status: currentPayment })}
            className="btn-primary shrink-0 px-4 text-sm"
          >
            Guardar
          </button>
        </div>
      </div>

      {message && (
        <p
          role="status"
          className={`text-sm font-medium ${message.kind === 'ok' ? 'text-green-600' : 'text-red-600'}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
