import { esBot, guardarFicha, listarFichas, marcarHecho } from "@/lib/bot-store";
import { forbidden, isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

// POST: la extensión actualiza la ficha del chat (clave del bot).
// GET / PATCH: el portal /admin/bot lista las fichas y tilda pendientes (administrador).
export async function POST(request: Request) {
  if (!(await esBot(request))) return Response.json({ error: "Clave del bot inválida." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Datos inválidos." }, { status: 400 });
  await guardarFicha(body);
  return Response.json({ ok: true });
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  return Response.json({ fichas: await listarFichas() }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  const b = (await request.json().catch(() => null)) as { id?: unknown; pendiente?: unknown; hecho?: unknown } | null;
  const ok = await marcarHecho(String(b?.id ?? ""), String(b?.pendiente ?? ""), Boolean(b?.hecho));
  return ok ? Response.json({ ok }) : Response.json({ error: "No existe esa ficha o ese pendiente." }, { status: 404 });
}
