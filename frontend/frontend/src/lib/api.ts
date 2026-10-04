/** Respuestas JSON uniformes para las rutas /api. */

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...init?.headers,
    },
  });
}

export function errorJson(message: string, status = 400): Response {
  return json({ error: message }, { status });
}
