import { esBot, guardarFoto, leerFoto, MAX_FOTO } from "@/lib/bot-store";
import { forbidden, isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

// POST: la extensión sube una foto que mandó el cliente (clave del bot). Cuerpo = la imagen;
// X-Conv = id del chat, X-Msg = id del mensaje + número de foto.
// GET ?conv=&f=: el portal la muestra (solo administrador, nunca pública ni cacheada).
const leerDesc = (v: string | null) => {
  try { return decodeURIComponent(v ?? "").slice(0, 300); } catch { return ""; }
};

export async function POST(request: Request) {
  if (!(await esBot(request))) return Response.json({ error: "Clave del bot inválida." }, { status: 401 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_FOTO) return Response.json({ error: "Foto muy grande." }, { status: 413 });
  const datos = Buffer.from(await request.arrayBuffer());
  const nombre = await guardarFoto(
    request.headers.get("x-conv") ?? "",
    (request.headers.get("x-msg") ?? "").slice(0, 200),
    (request.headers.get("content-type") ?? "").split(";")[0].trim(),
    datos,
    {
      tipo: ["auto", "dni", "recibo", "papeles", "otro"].includes(request.headers.get("x-tipo") ?? "") ? request.headers.get("x-tipo")! : "",
      desc: leerDesc(request.headers.get("x-desc")),
    },
  );
  return nombre ? Response.json({ ok: true, nombre }) : Response.json({ error: "Foto inválida." }, { status: 400 });
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  const q = new URL(request.url).searchParams;
  const foto = await leerFoto(q.get("conv") ?? "", q.get("f") ?? "");
  if (!foto) return Response.json({ error: "No existe." }, { status: 404 });
  return new Response(new Uint8Array(foto.datos), {
    headers: { "Content-Type": foto.tipo, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
