import { guardarTextos, leerConfig, nuevaClave } from "@/lib/bot-store";
import { forbidden, isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

// Portal /admin/bot: leer y guardar lo que sabe el bot y generar su clave (solo administrador).
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  const { negocio, estilo, claveHash, actualizado } = await leerConfig();
  return Response.json({ negocio, estilo, conClave: Boolean(claveHash), actualizado }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  const body = (await request.json().catch(() => null)) as { negocio?: unknown; estilo?: unknown } | null;
  await guardarTextos(String(body?.negocio ?? ""), String(body?.estilo ?? ""));
  return Response.json({ ok: true });
}

// La clave se muestra una sola vez; la anterior deja de valer.
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  return Response.json({ clave: await nuevaClave() }, { headers: { "Cache-Control": "no-store" } });
}
