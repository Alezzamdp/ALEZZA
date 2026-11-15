import { demasiados, excedido } from "@/lib/limite";

// Clave del bot que manda la extensión (X-Bot-Key). La valida la base de datos; acá solo se frena
// a quien prueba claves sin parar y se descarta lo que ni tiene la forma de una clave.
export function claveBot(request: Request): string | Response {
  if (excedido(request, "bot", 60)) return demasiados();
  const clave = request.headers.get("x-bot-key") ?? "";
  return /^alz_[A-Za-z0-9_-]{20,60}$/.test(clave) ? clave : claveInvalida();
}

export const claveInvalida = () => Response.json({ error: "Clave del bot inválida." }, { status: 401 });
