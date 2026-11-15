import { guardarTextos, importarDeEstaPC, leerConfig, nuevaClave } from "@/lib/bot-store";
import { forbidden, isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

const fallo = (e: unknown) => Response.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });

// Portal /admin/bot: leer y guardar lo que sabe el bot, generar su clave y traer los datos
// que había en archivos de esta PC (solo administrador).
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  try {
    return Response.json(await leerConfig(request), { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return fallo(e); }
}

export async function PUT(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  const body = (await request.json().catch(() => null)) as { negocio?: unknown; estilo?: unknown } | null;
  try {
    await guardarTextos(request, String(body?.negocio ?? ""), String(body?.estilo ?? ""));
    return Response.json({ ok: true });
  } catch (e) { return fallo(e); }
}

// POST: clave nueva (se muestra una sola vez). POST ?importar=1: trae los archivos de esta PC.
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  try {
    if (new URL(request.url).searchParams.get("importar") === "1") return Response.json(await importarDeEstaPC(request));
    return Response.json({ clave: await nuevaClave(request) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return fallo(e); }
}
