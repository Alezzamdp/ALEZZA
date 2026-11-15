import { esBot, registrar, ultimasActividades } from "@/lib/bot-store";
import { forbidden, isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

// POST: la extensión anota cada respuesta que envió (clave del bot).
// GET: el portal /admin/bot lee la actividad (administrador).
export async function POST(request: Request) {
  if (!(await esBot(request))) return Response.json({ error: "Clave del bot inválida." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Datos inválidos." }, { status: 400 });
  await registrar(body);
  return Response.json({ ok: true });
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  return Response.json({ actividad: await ultimasActividades() }, { headers: { "Cache-Control": "no-store" } });
}
