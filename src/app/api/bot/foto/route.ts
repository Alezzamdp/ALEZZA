import { guardarFoto, leerFoto, MAX_FOTO } from "@/lib/bot-store";
import { forbidden, isAdminRequest } from "@/lib/server-admin";
import { claveBot } from "../clave";

export const runtime = "nodejs";

const leerDesc = (v: string | null) => {
  try { return decodeURIComponent(v ?? "").slice(0, 300); } catch { return ""; }
};
const TIPOS = ["auto", "dni", "recibo", "papeles", "otro"];

// POST: la extensión sube una foto que mandó el cliente (clave del bot). Cuerpo = la imagen;
// X-Conv = id del chat, X-Msg = id del mensaje + número de foto, X-Tipo / X-Desc = lo que vio la IA.
// GET ?conv=&f=: el portal la muestra (solo administrador, nunca pública ni cacheada).
export async function POST(request: Request) {
  const clave = claveBot(request);
  if (clave instanceof Response) return clave;
  if (Number(request.headers.get("content-length") ?? 0) > MAX_FOTO) return Response.json({ error: "Foto muy grande." }, { status: 413 });
  const tipoFoto = request.headers.get("x-tipo") ?? "";
  const nombre = await guardarFoto(
    clave,
    request.headers.get("x-conv") ?? "",
    (request.headers.get("x-msg") ?? "").slice(0, 200),
    (request.headers.get("content-type") ?? "").split(";")[0].trim(),
    Buffer.from(await request.arrayBuffer()),
    { tipo: TIPOS.includes(tipoFoto) ? tipoFoto : "", desc: leerDesc(request.headers.get("x-desc")) },
  );
  return nombre ? Response.json({ ok: true, nombre }) : Response.json({ error: "Foto inválida o clave del bot inválida." }, { status: 400 });
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  const q = new URL(request.url).searchParams;
  const foto = await leerFoto(request, q.get("conv") ?? "", q.get("f") ?? "");
  if (!foto) return Response.json({ error: "No existe." }, { status: 404 });
  return new Response(new Uint8Array(foto.datos), {
    headers: { "Content-Type": foto.tipo, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
