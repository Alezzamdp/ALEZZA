import { crearPreferencia, mpHabilitado, origenDe, turnoPorToken } from "@/lib/mercadopago";

export const runtime = "nodejs";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Crea el pago de la seña en Mercado Pago y devuelve el enlace para pagar.
export async function POST(request: Request) {
  if (!mpHabilitado()) return json({ error: "El pago con Mercado Pago todavía no está habilitado." }, 404);
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  try {
    const turno = await turnoPorToken(token);
    if (!turno) return json({ error: "No encontramos ese turno." }, 404);
    if (turno.estado === "cancelado" || turno.pago_estado === "confirmado") return json({ error: "Este turno no espera un pago." }, 409);
    return json({ url: await crearPreferencia(turno, token, origenDe(request)) });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "No se pudo iniciar el pago." }, 502);
  }
}
