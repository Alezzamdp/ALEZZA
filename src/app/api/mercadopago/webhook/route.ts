import { mpHabilitado, verificarPago } from "@/lib/mercadopago";

export const runtime = "nodejs";

// Aviso de Mercado Pago. No se confía en el contenido: se lee el pago en la API y recién ahí se confirma.
export async function POST(request: Request) {
  if (!mpHabilitado()) return new Response(null, { status: 404 });
  const url = new URL(request.url);
  const body = await request.json().catch(() => null);
  const tipo = body?.type ?? body?.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const id = String(body?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
  if (tipo === "payment" && id) {
    try { await verificarPago(id); } catch { return new Response(null, { status: 500 }); } // 500: Mercado Pago reintenta
  }
  return new Response(null, { status: 200 });
}
