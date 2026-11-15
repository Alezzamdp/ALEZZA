import { guardarFicha, listarFichas, marcarHecho } from "@/lib/bot-store";
import { forbidden, isAdminRequest } from "@/lib/server-admin";
import { claveBot, claveInvalida } from "../clave";

export const runtime = "nodejs";

// POST: la extensión actualiza la ficha del chat (clave del bot).
// GET / PATCH: el portal /admin/bot lista las fichas y tilda pendientes (administrador).
export async function POST(request: Request) {
  const clave = claveBot(request);
  if (clave instanceof Response) return clave;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Datos inválidos." }, { status: 400 });
  return (await guardarFicha(clave, body)) ? Response.json({ ok: true }) : claveInvalida();
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  return Response.json({ fichas: await listarFichas(request) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  const b = (await request.json().catch(() => null)) as { id?: unknown; pendiente?: unknown; hecho?: unknown } | null;
  const ok = await marcarHecho(request, String(b?.id ?? ""), String(b?.pendiente ?? ""), Boolean(b?.hecho));
  return ok ? Response.json({ ok }) : Response.json({ error: "No existe esa ficha o ese pendiente." }, { status: 404 });
}
