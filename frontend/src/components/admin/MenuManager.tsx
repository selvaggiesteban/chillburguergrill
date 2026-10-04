import { useEffect, useState } from 'react';
import type { Category, Product, ExtraDetailed, Promotion } from '../../lib/d1';
import { CategoriesPanel, ProductsPanel, ExtrasPanel, PromosPanel, type ApiFn } from './MenuPanels';

type Tab = 'productos' | 'categorias' | 'extras' | 'promos';

const TABS: { id: Tab; label: string }[] = [
  { id: 'productos', label: 'Productos' },
  { id: 'categorias', label: 'Categorías' },
  { id: 'extras', label: 'Agregados' },
  { id: 'promos', label: 'Promociones' },
];

export default function MenuManager() {
  const [tab, setTab] = useState<Tab>('productos');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [extras, setExtras] = useState<ExtraDetailed[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(data.error ?? `Error ${response.status}`);
    return data as T;
  }

  const reload = async () => {
    setError(null);
    try {
      const [cats, prods, exts, promos] = await Promise.all([
        api<{ categories: Category[] }>('/api/admin/categories'),
        api<{ products: Product[] }>('/api/admin/products'),
        api<{ extras: ExtraDetailed[] }>('/api/admin/extras'),
        api<{ promotions: Promotion[] }>('/api/admin/promotions'),
      ]);
      setCategories(cats.categories);
      setProducts(prods.products);
      setExtras(exts.extras);
      setPromotions(promos.promotions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la carta');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <p className="card p-8 text-center text-slate-500">Cargando la carta…</p>;
  }

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap gap-2" aria-label="Secciones de la carta">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tab === t.id ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {tab === 'productos' && <ProductsPanel products={products} categories={categories} api={api as ApiFn} reload={reload} />}
      {tab === 'categorias' && <CategoriesPanel categories={categories} api={api as ApiFn} reload={reload} />}
      {tab === 'extras' && <ExtrasPanel extras={extras} products={products} api={api as ApiFn} reload={reload} />}
      {tab === 'promos' && (
        <PromosPanel promotions={promotions} products={products} categories={categories} api={api as ApiFn} reload={reload} />
      )}
    </div>
  );
}
