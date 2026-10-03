/**
 * Config pública de la tienda (contacto + horarios) con memoización por request.
 *
 * La lee una sola vez por render: la página puede pedirla en su frontmatter y
 * BaseLayout/Footer reutilizan el mismo resultado (1 subrequest D1 en vez de 2).
 */
import { getConfigs } from './d1';

export type ContactConfig = {
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  address_url?: string;
  instagram?: string;
};

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type DayHours = { closed?: boolean; open?: string; close?: string };
export type HoursConfig = { days?: Partial<Record<DayKey, DayHours>> };
export type PublicConfig = { contact: ContactConfig | null; hours: HoursConfig | null };

export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DAY_LABELS_ES: Record<DayKey, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo',
};
export const DAY_LABELS_EN: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};
const DAY_SHORT_ES: Record<DayKey, string> = {
  mon: 'Lun',
  tue: 'Mar',
  wed: 'Mié',
  thu: 'Jue',
  fri: 'Vie',
  sat: 'Sáb',
  sun: 'Dom',
};

const LEGACY_GROUPS: Record<string, DayKey[]> = {
  mon_to_thu: ['mon', 'tue', 'wed', 'thu'],
  fri_sat: ['fri', 'sat'],
  sun: ['sun'],
};

export async function loadPublicConfig(locals: App.Locals): Promise<PublicConfig> {
  if (locals.publicConfig) return locals.publicConfig;

  let out: PublicConfig = { contact: null, hours: null };
  try {
    const cfg = await getConfigs<{ contact: ContactConfig; hours: HoursConfig }>(locals.runtime.env.DB, [
      'contact',
      'hours',
    ]);
    out = { contact: cfg.contact ?? null, hours: cfg.hours ?? null };
  } catch {
    /* la config es best-effort: nunca debe romper el render */
  }

  locals.publicConfig = out;
  return out;
}

const RANGE_RE = /^\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*$/;

/** Horario por día. Soporta el formato nuevo (`days`) y el legado (rango por grupo de días). */
export function hoursByDay(hours: HoursConfig | null): Record<DayKey, DayHours | null> {
  const out = {} as Record<DayKey, DayHours | null>;
  if (hours?.days) {
    for (const key of DAY_KEYS) out[key] = hours.days[key] ?? null;
    return out;
  }

  const legacy = (hours ?? {}) as Record<string, unknown>;
  for (const [group, days] of Object.entries(LEGACY_GROUPS)) {
    const raw = typeof legacy[group] === 'string' ? (legacy[group] as string) : '';
    const match = raw.match(RANGE_RE);
    for (const day of days) {
      out[day] = match ? { closed: false, open: match[1], close: match[2] } : null;
    }
  }
  return out;
}

type Run = { from: number; to: number; range: string | null };

function toRuns(hours: HoursConfig | null): Run[] {
  const byDay = hoursByDay(hours);
  const runs: Run[] = [];
  for (let i = 0; i < DAY_KEYS.length; i++) {
    const day = byDay[DAY_KEYS[i]];
    const range = day && !day.closed && day.open && day.close ? `${day.open} - ${day.close}` : null;
    const prev = runs[runs.length - 1];
    if (prev && prev.range === range) prev.to = i;
    else runs.push({ from: i, to: i, range });
  }
  return runs;
}

function runLabel(run: Run): string {
  const first = DAY_SHORT_ES[DAY_KEYS[run.from]];
  const last = DAY_SHORT_ES[DAY_KEYS[run.to]];
  return run.from === run.to ? first : `${first} a ${last}`;
}

/** "Jue a Dom · 20:00 - 23:50" (o "Cerrado toda la semana"). */
export function formatSchedule(hours: HoursConfig | null): string {
  const open = toRuns(hours).filter((r) => r.range);
  if (open.length === 0) return 'Cerrado toda la semana';
  return open.map((r) => `${runLabel(r)} · ${r.range}`).join('   ·   ');
}

/** [{ dayOfWeek, opens, closes }] para schema.org, solo días abiertos. */
export function jsonLdOpeningHours(hours: HoursConfig | null): {
  dayOfWeek: string;
  opens: string;
  closes: string;
}[] {
  const byDay = hoursByDay(hours);
  const out: { dayOfWeek: string; opens: string; closes: string }[] = [];
  for (const key of DAY_KEYS) {
    const day = byDay[key];
    if (day && !day.closed && day.open && day.close) {
      out.push({ dayOfWeek: DAY_LABELS_EN[key], opens: day.open, closes: day.close });
    }
  }
  return out;
}
