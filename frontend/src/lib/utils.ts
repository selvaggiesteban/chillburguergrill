export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function normalizeImages(input: unknown): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v !== 'string') return;
    const s = v.trim();
    if (!s) return;
    if (s.startsWith('[')) {
      try {
        const inner: unknown = JSON.parse(s);
        if (Array.isArray(inner)) {
          inner.forEach(push);
          return;
        }
      } catch {
        /* URL que arranca con '[' y no es JSON: se toma como texto */
      }
    }
    out.push(s.slice(0, 500));
  };
  if (Array.isArray(input)) input.forEach(push);
  else if (typeof input === 'string') input.split('\n').forEach(push);
  return out.slice(0, 8);
}

export function parseImages(images: string | null | undefined): string[] {
  if (!images) return [];
  try {
    return normalizeImages(JSON.parse(images));
  } catch {
    return normalizeImages(images);
  }
}

export function coverOf(images: string[], coverIndex: number): string {
  if (images.length === 0) return '/images/menu/placeholder.svg';
  const idx = Math.min(Math.max(coverIndex, 0), images.length - 1);
  return images[idx];
}
