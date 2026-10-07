import { useState } from 'react';
import type { Category, Product, ExtraDetailed, Promotion } from '../../lib/d1';

export type ApiFn = <T>(path: string, init?: RequestInit) => Promise<T>;

const toInput = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromInput = (value: string): string | null => (value ? new Date(value).toISOString() : null);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function PanelShell({
  title,
  onNew,
  newLabel,
  children,
}: {
  title: string;
  onNew: () => void;
  newLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl uppercase text-slate-800">{title}</h2>
        <button type="button" onClick={onNew} className="btn-primary px-4 py-2 text-sm">
          + {newLabel}
        </button>
      </div>
      {children}
    </div>
  );
}

function ConfirmButton({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span className="inline-flex gap-1">
        <button type="button" onClick={onConfirm} className="text-xs font-bold text-red-600 hover:underline">
          ¿Seguro?
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-xs text-slate-400 hover:text-slate-600">
          no
        </button>
      </span>
    );
  }
  return (
    <button type="button" onClick={() => setConfirming(true)} className="text-xs font-semibold text-red-500 hover:text-red-700">
      {label}
    </button>
  );
}

function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
      {error}
    </p>
  );
}

// ============================================================
// Categorías
// ============================================================

export function CategoriesPanel({
  categories,
  api,
  reload,
}: {
  categories: Category[];
  api: ApiFn;
  reload: () => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Category> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form) return;
    setBusy(true);
    setError(null);
    try {
      const payload = { name: form.name, description: form.description ?? '', orden: form.orden ?? 0, visible: form.visible ?? 1, destacada: form.destacada ?? 0 };
      if (form.id) await api(`/api/admin/categories/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/api/admin/categories', { method: 'POST', body: JSON.stringify(payload) });
      setForm(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setError(null);
    try {
      await api(`/api/admin/categories/${id}`, { method: 'DELETE' });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <PanelShell title="Categorías" onNew={() => setForm({ visible: 1, destacada: 0, orden: 0 })} newLabel="Nueva categoría">
      <ErrorBox error={error} />
      {form && (
        <div className="card space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre">
              <input className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Orden">
              <input
                type="number"
                className="input"
                value={form.orden ?? 0}
                onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Descripción">
                <input
                  className="input"
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.visible === 1}
                onChange={(e) => setForm({ ...form, visible: e.target.checked ? 1 : 0 })}
              />
              Visible en la carta
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.destacada === 1}
                onChange={(e) => setForm({ ...form, destacada: e.target.checked ? 1 : 0 })}
              />
              Destacada
            </label>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={busy || !form.name} onClick={save} className="btn-primary px-4 py-2 text-sm">
              Guardar
            </button>
            <button type="button" onClick={() => setForm(null)} className="btn-secondary px-4 py-2 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Orden</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Visible</th>
              <th className="px-4 py-3">Destacada</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-400">{category.orden}</td>
                <td className="px-4 py-2.5 font-semibold text-slate-800">{category.name}</td>
                <td className="px-4 py-2.5">{category.visible === 1 ? 'Sí' : 'No'}</td>
                <td className="px-4 py-2.5">{category.destacada === 1 ? 'Sí' : 'No'}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className="inline-flex gap-3">
                    <button
                      type="button"
                      onClick={() => setForm(category)}
                      className="text-xs font-semibold text-black hover:underline"
                    >
                      Editar
                    </button>
                    <ConfirmButton label="Borrar" onConfirm={() => void remove(category.id)} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelShell>
  );
}

// ============================================================
// Productos
// ============================================================

type ProductForm = Partial<Product> & { comboItems?: { product_id: number; quantity: number }[] };

export function ProductsPanel({
  products,
  categories,
  api,
  reload,
}: {
  products: Product[];
  categories: Category[];
  api: ApiFn;
  reload: () => Promise<void>;
}) {
  const [form, setForm] = useState<ProductForm | null>(null);
  const [comboFor, setComboFor] = useState<Product | null>(null);
  const [comboItems, setComboItems] = useState<{ product_id: number; quantity: number; product_name?: string }[]>([]);
  const [comboProductId, setComboProductId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

  const openEdit = async (product: Product) => {
    setError(null);
    setForm({ ...product });
    if (product.type === 'combo') {
      try {
        const data = await api<{ items: { product_id: number; quantity: number; product_name: string }[] }>(
          `/api/admin/products/${product.id}/combo`
        );
        setComboItems(data.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity, product_name: i.product_name })));
      } catch {
        setComboItems([]);
      }
    }
  };

  const save = async () => {
    if (!form || !form.name || !form.category_id) {
      setError('Nombre y categoría son obligatorios');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const images = String(form.images ?? '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = {
        name: form.name,
        category_id: form.category_id,
        type: form.type ?? 'simple',
        price: form.price ?? 0,
        description: form.description ?? '',
        images: Array.isArray(form.images) ? form.images : images,
        orden: form.orden ?? 0,
        disponible: form.disponible ?? 1,
        visible: form.visible ?? 1,
        destacado: form.destacado ?? 0,
      };
      let productId = form.id;
      if (form.id) {
        await api(`/api/admin/products/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        const created = await api<{ id: number }>('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) });
        productId = created.id;
      }
      if (productId && (payload.type === 'combo' || comboItems.length > 0)) {
        await api(`/api/admin/products/${productId}/combo`, {
          method: 'PUT',
          body: JSON.stringify({ items: comboItems.map(({ product_id, quantity }) => ({ product_id, quantity })) }),
        });
      }
      setForm(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setError(null);
    try {
      await api(`/api/admin/products/${id}`, { method: 'DELETE' });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const toggle = async (product: Product, field: 'disponible' | 'visible' | 'destacado') => {
    setError(null);
    try {
      await api(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: product[field] === 1 ? 0 : 1 }),
      });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const imagesText = Array.isArray(form?.images) ? (form.images as string[]).join('\n') : String(form?.images ?? '');

  const uploadImage = async (file: File) => {
    if (!form) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/images', { method: 'POST', body: fd });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? 'No se pudo subir la imagen');
      const current = imagesText.split('\n').map((s) => s.trim()).filter(Boolean);
      setForm({ ...form, images: [...current, data.url].join('\n') });
      setUploadMsg({ kind: 'ok', text: 'Imagen subida' });
    } catch (e) {
      setUploadMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Error al subir' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <PanelShell
      title="Productos"
      onNew={() => {
        setForm({ category_id: categories[0]?.id, type: 'simple', price: 0, visible: 1, disponible: 1, destacado: 0, orden: 0, images: '' });
        setComboItems([]);
      }}
      newLabel="Nuevo producto"
    >
      <ErrorBox error={error} />

      {form && (
        <div className="card space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre">
              <input className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Categoría">
              <select
                className="input"
                value={form.category_id ?? ''}
                onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Precio">
              <input
                type="number"
                min={0}
                className="input"
                value={form.price ?? 0}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </Field>
            <Field label="Tipo">
              <select
                className="input"
                value={form.type ?? 'simple'}
                onChange={(e) => setForm({ ...form, type: e.target.value as Product['type'] })}
              >
                <option value="simple">Simple</option>
                <option value="combo">Combo</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Descripción">
                <textarea
                  rows={2}
                  className="input resize-none"
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Imágenes (URLs, una por línea)">
                <textarea
                  rows={2}
                  className="input resize-none font-mono text-xs"
                  placeholder="/images/menu/placeholder.svg"
                  value={imagesText}
                  onChange={(e) => setForm({ ...form, images: e.target.value })}
                />
              </Field>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <label className="btn-secondary inline-flex cursor-pointer items-center px-3 py-1.5 text-xs font-semibold">
                  {uploading ? 'Subiendo…' : 'Subir imagen'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) void uploadImage(file);
                    }}
                  />
                </label>
                {uploadMsg && (
                  <span className={`text-xs ${uploadMsg.kind === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
                    {uploadMsg.text}
                  </span>
                )}
              </div>
            </div>
            <Field label="Orden">
              <input
                type="number"
                className="input"
                value={form.orden ?? 0}
                onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })}
              />
            </Field>
            <div className="flex flex-wrap items-end gap-4 pb-1 text-sm font-medium">
              {(
                [
                  ['visible', 'Visible'],
                  ['disponible', 'Disponible'],
                  ['destacado', 'Destacado'],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={(form[field] ?? 0) === 1}
                    onChange={(e) => setForm({ ...form, [field]: e.target.checked ? 1 : 0 })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {form.type === 'combo' && (
            <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Ítems del combo</p>
              <ul className="mb-2 space-y-1 text-sm">
                {comboItems.length === 0 && <li className="text-slate-400">Sin ítems todavía.</li>}
                {comboItems.map((item, index) => (
                  <li key={`${item.product_id}-${index}`} className="flex items-center justify-between gap-2">
                    <span>
                      {item.quantity}× {item.product_name ?? products.find((p) => p.id === item.product_id)?.name ?? `#${item.product_id}`}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:text-red-700"
                      onClick={() => setComboItems(comboItems.filter((_, i) => i !== index))}
                    >
                      quitar
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <select className="input" value={comboProductId} onChange={(e) => setComboProductId(e.target.value)}>
                  <option value="">Elegir producto…</option>
                  {products
                    .filter((p) => p.id !== form.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!comboProductId}
                  onClick={() => {
                    const pid = Number(comboProductId);
                    if (!pid) return;
                    const existing = comboItems.find((i) => i.product_id === pid);
                    if (existing) {
                      setComboItems(comboItems.map((i) => (i.product_id === pid ? { ...i, quantity: i.quantity + 1 } : i)));
                    } else {
                      setComboItems([...comboItems, { product_id: pid, quantity: 1 }]);
                    }
                    setComboProductId('');
                  }}
                  className="btn-secondary shrink-0 px-4 text-sm"
                >
                  + Agregar
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={save} className="btn-primary px-4 py-2 text-sm">
              Guardar
            </button>
            <button type="button" onClick={() => setForm(null)} className="btn-secondary px-4 py-2 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <a
                      href={`/producto/${product.slug}`}
                      target="_blank"
                      className="font-semibold text-slate-800 hover:text-black"
                    >
                      {product.name}
                    </a>
                    {product.type === 'combo' && <span className="ml-2 rounded bg-black px-1.5 py-0.5 text-xs font-bold text-white">combo</span>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{categoryNames.get(product.category_id) ?? '—'}</td>
                  <td className="px-4 py-2.5 font-semibold">${product.price.toLocaleString('es-AR')}</td>
                  <td className="px-4 py-2.5">
                    <span className="flex gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => void toggle(product, 'visible')}
                        title="Visible"
                        className={`rounded px-1.5 py-0.5 font-bold ${product.visible === 1 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}
                      >
                        vis
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggle(product, 'disponible')}
                        title="Disponible"
                        className={`rounded px-1.5 py-0.5 font-bold ${product.disponible === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}
                      >
                        disp
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggle(product, 'destacado')}
                        title="Destacado"
                        className={`rounded px-1.5 py-0.5 font-bold ${product.destacado === 1 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}
                      >
                        dest
                      </button>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="inline-flex gap-3">
                      <button
                        type="button"
                        onClick={() => void openEdit(product)}
                        className="text-xs font-semibold text-black hover:underline"
                      >
                        Editar
                      </button>
                      <ConfirmButton label="Borrar" onConfirm={() => void remove(product.id)} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {comboFor && null}
    </PanelShell>
  );
}

// ============================================================
// Extras
// ============================================================

export function ExtrasPanel({
  extras,
  products,
  api,
  reload,
}: {
  extras: ExtraDetailed[];
  products: Product[];
  api: ApiFn;
  reload: () => Promise<void>;
}) {
  const [form, setForm] = useState<{ id?: number; name: string; price: number; product_id: number | ''; orden: number; active: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const productNames = new Map(products.map((p) => [p.id, p.name]));

  const save = async () => {
    if (!form || form.name.trim().length < 2) {
      setError('Nombre demasiado corto');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        price: form.price,
        product_id: form.product_id === '' ? null : form.product_id,
        orden: form.orden,
        active: form.active,
      };
      if (form.id) await api(`/api/admin/extras/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/api/admin/extras', { method: 'POST', body: JSON.stringify(payload) });
      setForm(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setError(null);
    try {
      await api(`/api/admin/extras/${id}`, { method: 'DELETE' });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const toggleActive = async (extra: ExtraDetailed) => {
    setError(null);
    try {
      await api(`/api/admin/extras/${extra.id}`, { method: 'PUT', body: JSON.stringify({ active: extra.active === 1 ? 0 : 1 }) });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <PanelShell
      title="Agregados (extras)"
      onNew={() => setForm({ name: '', price: 0, product_id: '', orden: 0, active: 1 })}
      newLabel="Nuevo extra"
    >
      <ErrorBox error={error} />
      <p className="text-sm text-slate-500">
        Los extras sin producto asociado están disponibles para toda la carta.
      </p>

      {form && (
        <div className="card space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre">
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Precio">
              <input
                type="number"
                min={0}
                className="input"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </Field>
            <Field label="Producto (vacío = global)">
              <select
                className="input"
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value === '' ? '' : Number(e.target.value) })}
              >
                <option value="">Todos los productos</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Orden">
              <input
                type="number"
                className="input"
                value={form.orden}
                onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={save} className="btn-primary px-4 py-2 text-sm">
              Guardar
            </button>
            <button type="button" onClick={() => setForm(null)} className="btn-secondary px-4 py-2 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Extra</th>
              <th className="px-4 py-3">Alcance</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Activo</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {extras.map((extra) => (
              <tr key={extra.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-semibold text-slate-800">{extra.name}</td>
                <td className="px-4 py-2.5 text-slate-500">
                  {extra.product_id ? productNames.get(extra.product_id) ?? '—' : 'Todos'}
                </td>
                <td className="px-4 py-2.5 font-semibold">
                  {extra.price > 0 ? `$${extra.price.toLocaleString('es-AR')}` : 'Gratis'}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => void toggleActive(extra)}
                    className={`rounded px-2 py-0.5 text-xs font-bold ${extra.active === 1 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}
                  >
                    {extra.active === 1 ? 'sí' : 'no'}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="inline-flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          id: extra.id,
                          name: extra.name,
                          price: extra.price,
                          product_id: extra.product_id ?? '',
                          orden: extra.orden,
                          active: extra.active,
                        })
                      }
                      className="text-xs font-semibold text-black hover:underline"
                    >
                      Editar
                    </button>
                    <ConfirmButton label="Borrar" onConfirm={() => void remove(extra.id)} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelShell>
  );
}

// ============================================================
// Promociones
// ============================================================

export function PromosPanel({
  promotions,
  products,
  categories,
  api,
  reload,
}: {
  promotions: Promotion[];
  products: Product[];
  categories: Category[];
  api: ApiFn;
  reload: () => Promise<void>;
}) {
  const [form, setForm] = useState<{
    id?: number;
    name: string;
    scope: Promotion['scope'];
    target_id: number | null;
    discount_pct: number;
    start_at: string;
    end_at: string;
    active: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form || form.name.trim().length < 2) {
      setError('Nombre demasiado corto');
      return;
    }
    if (form.scope !== 'store' && !form.target_id) {
      setError('Elegí el producto o categoría destino');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        scope: form.scope,
        target_id: form.scope === 'store' ? null : form.target_id,
        discount_pct: form.discount_pct,
        start_at: fromInput(form.start_at),
        end_at: fromInput(form.end_at),
        active: form.active,
      };
      if (form.id) await api(`/api/admin/promotions/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/api/admin/promotions', { method: 'POST', body: JSON.stringify(payload) });
      setForm(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setError(null);
    try {
      await api(`/api/admin/promotions/${id}`, { method: 'DELETE' });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const toggleActive = async (promo: Promotion) => {
    setError(null);
    try {
      await api(`/api/admin/promotions/${promo.id}`, { method: 'PUT', body: JSON.stringify({ active: promo.active === 1 ? 0 : 1 }) });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const targetLabel = (promo: Promotion) => {
    if (promo.scope === 'store') return 'Toda la tienda';
    if (promo.scope === 'category') return `Categoría: ${categories.find((c) => c.id === promo.target_id)?.name ?? promo.target_id}`;
    return `Producto: ${products.find((p) => p.id === promo.target_id)?.name ?? promo.target_id}`;
  };

  return (
    <PanelShell
      title="Promociones"
      onNew={() => setForm({ name: '', scope: 'store', target_id: null, discount_pct: 10, start_at: '', end_at: '', active: 1 })}
      newLabel="Nueva promoción"
    >
      <ErrorBox error={error} />

      {form && (
        <div className="card space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre">
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Descuento %">
              <input
                type="number"
                min={1}
                max={90}
                className="input"
                value={form.discount_pct}
                onChange={(e) => setForm({ ...form, discount_pct: Number(e.target.value) })}
              />
            </Field>
            <Field label="Aplica a">
              <select
                className="input"
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value as Promotion['scope'], target_id: null })}
              >
                <option value="store">Toda la tienda</option>
                <option value="category">Una categoría</option>
                <option value="product">Un producto</option>
              </select>
            </Field>
            {form.scope === 'category' && (
              <Field label="Categoría">
                <select
                  className="input"
                  value={form.target_id ?? ''}
                  onChange={(e) => setForm({ ...form, target_id: Number(e.target.value) })}
                >
                  <option value="">Elegir…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {form.scope === 'product' && (
              <Field label="Producto">
                <select
                  className="input"
                  value={form.target_id ?? ''}
                  onChange={(e) => setForm({ ...form, target_id: Number(e.target.value) })}
                >
                  <option value="">Elegir…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Desde (opcional)">
              <input
                type="datetime-local"
                className="input"
                value={form.start_at}
                onChange={(e) => setForm({ ...form, start_at: e.target.value })}
              />
            </Field>
            <Field label="Hasta (opcional)">
              <input
                type="datetime-local"
                className="input"
                value={form.end_at}
                onChange={(e) => setForm({ ...form, end_at: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={save} className="btn-primary px-4 py-2 text-sm">
              Guardar
            </button>
            <button type="button" onClick={() => setForm(null)} className="btn-secondary px-4 py-2 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Promoción</th>
              <th className="px-4 py-3">Alcance</th>
              <th className="px-4 py-3">Descuento</th>
              <th className="px-4 py-3">Vigencia</th>
              <th className="px-4 py-3">Activa</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {promotions.map((promo) => (
              <tr key={promo.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-semibold text-slate-800">{promo.name}</td>
                <td className="px-4 py-2.5 text-slate-500">{targetLabel(promo)}</td>
                <td className="px-4 py-2.5 font-bold text-black">{promo.discount_pct}%</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">
                  {(promo.start_at ?? 'siempre').slice(0, 10)} al {(promo.end_at ?? 'siempre').slice(0, 10)}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => void toggleActive(promo)}
                    className={`rounded px-2 py-0.5 text-xs font-bold ${promo.active === 1 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}
                  >
                    {promo.active === 1 ? 'sí' : 'no'}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="inline-flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          id: promo.id,
                          name: promo.name,
                          scope: promo.scope,
                          target_id: promo.target_id,
                          discount_pct: promo.discount_pct,
                          start_at: toInput(promo.start_at),
                          end_at: toInput(promo.end_at),
                          active: promo.active,
                        })
                      }
                      className="text-xs font-semibold text-black hover:underline"
                    >
                      Editar
                    </button>
                    <ConfirmButton label="Borrar" onConfirm={() => void remove(promo.id)} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelShell>
  );
}
