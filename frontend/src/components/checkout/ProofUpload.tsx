import { useRef, useState } from 'react';

type Props = { orderId: string };

const MAX_SIZE = 5 * 1024 * 1024;

export default function ProofUpload({ orderId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus('error');
      setMessage('Subí una imagen (JPG o PNG).');
      return;
    }
    if (file.size > MAX_SIZE) {
      setStatus('error');
      setMessage('La imagen supera los 5 MB.');
      return;
    }

    setStatus('uploading');
    setMessage('');
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch(`/api/orders/${orderId}/proof`, {
        method: 'POST',
        body: form,
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudo subir el comprobante');
      }
      setStatus('done');
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Error inesperado');
    }
  };

  if (status === 'done') {
    return (
      <div className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
        ✓ Comprobante enviado. Lo revisamos y te confirmamos por WhatsApp.
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        disabled={status === 'uploading'}
        onClick={() => inputRef.current?.click()}
        className="btn-primary w-full"
      >
        {status === 'uploading' ? 'Subiendo…' : 'Subir comprobante de pago'}
      </button>
      {status === 'error' && (
        <p className="mt-2 text-sm font-medium text-red-600" role="alert">
          {message}
        </p>
      )}
      <p className="mt-2 text-xs text-ink-800/50">JPG o PNG, hasta 5 MB.</p>
    </div>
  );
}
