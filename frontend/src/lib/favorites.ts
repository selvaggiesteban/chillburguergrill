/**
 * Favoritos en localStorage (sin cuenta ni backend).
 * Clave versionada para poder migrar sin romper datos viejos.
 */
const KEY = 'chill:favorites:v1';

function read(): number[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

export function isFavorite(id: number): boolean {
  return read().includes(id);
}

/** Devuelve el nuevo estado (true = quedó favorito). */
export function toggleFavorite(id: number): boolean {
  const list = read();
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* modo privado / cuota llena: el estado vive sólo en memoria */
  }
  return next.includes(id);
}
