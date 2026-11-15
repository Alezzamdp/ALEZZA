import { registrar, ultimasActividades } from "@/lib/bot-store";
import { forbidden, isAdminRequest } from "@/lib/server-admin";
import { claveBot, claveInvalida } from "../clave";

export const runtime = "nodejs";

// POST: la extensión anota cada respuesta que envió (clave del bot).
// GET: el portal /admin/bot lee la actividad (administrador).
export async function POST(request: Request) {
  const clave = claveBot(request);
  if (clave instanceof Response) return clave;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Datos inválidos." }, { status: 400 });
  return (await registrar(clave, body)) ? Response.json({ ok: true }) : claveInvalida();
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  return Response.json({ actividad: await ultimasActividades(request) }, { headers: { "Cache-Control": "no-store" } });
}
