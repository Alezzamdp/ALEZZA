import { mpHabilitado, turnoPorToken, verificarPago } from "@/lib/mercadopago";

export const runtime = "nodejs";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Al volver de Mercado Pago: confirma la seña leyendo el pago en la API (sirve aunque el aviso automático no llegue).
export async function POST(request: Request) {
  if (!mpHabilitado()) return json({ error: "Mercado Pago no está habilitado." }, 404);
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const pago = typeof body?.pago === "string" ? body.pago : "";
  try {
    const turno = await turnoPorToken(token);
    if (!turno) return json({ error: "No encontramos ese turno." }, 404);
    return json(await verificarPago(pago, turno.id));
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "No se pudo verificar el pago." }, 502);
  }
}
