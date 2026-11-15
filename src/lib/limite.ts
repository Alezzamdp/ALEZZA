// Límite simple de pedidos por IP para las rutas sin login (tasación y clave del bot):
// frena abusos y que alguien pruebe claves a lo loco.
// ponytail: en memoria, por proceso; con varios servidores usar Redis o similar.
const ventanas = new Map<string, { desde: number; n: number }>();

export function excedido(request: Request, clave: string, maximo: number, ventanaMs = 60_000) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const id = clave + ":" + ip;
  const ahora = Date.now();
  const v = ventanas.get(id);

  if (!v || ahora - v.desde > ventanaMs) {
    ventanas.set(id, { desde: ahora, n: 1 });
    if (ventanas.size > 5000) for (const [k, x] of ventanas) if (ahora - x.desde > ventanaMs) ventanas.delete(k);
    return false;
  }
  return ++v.n > maximo;
}

export const demasiados = () =>
  Response.json({ error: "Demasiados pedidos, probá en un minuto." }, { status: 429, headers: { "Retry-After": "60" } });
