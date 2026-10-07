/**
 * Interruptor maestro de Turnstile.
 * false = desactivado temporalmente: no se renderiza el widget ni se verifica
 * en checkout ni en login de admin (el resto de la infra queda intacta).
 * Para reactivar: TURNSTILE_ENABLED = true y redeploy.
 */
export const TURNSTILE_ENABLED = false;

export const TURNSTILE_SITEKEY = '0x4AAAAAAFQocgIu7oeEEhwP';

export const TURNSTILE_WORKER_URL =
  'https://turnstile-siteverify-chillburgergrill.selvaggi-esteban.workers.dev';
