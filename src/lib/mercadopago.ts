// Mercado Pago (Checkout Pro) para la seña de los turnos. Solo servidor.
// Se activa al cargar MERCADOPAGO_ACCESS_TOKEN en .env.local; sin eso, los turnos se pagan por transferencia.
// Un pago se da por bueno solo después de leerlo en la API de Mercado Pago (nunca por lo que diga el navegador).
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { SERVICIOS, type Servicio } from "@/lib/turnos";

const API = "https://api.mercadopago.com";

export const mpHabilitado = () => !!process.env.MERCADOPAGO_ACCESS_TOKEN;

function auth() {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!t) throw new Error("Mercado Pago no está configurado.");
  return { Authorization: `Bearer ${t}` };
}

export type TurnoPublico = {
  id: string; fecha: string; servicio: Servicio; nombre: string; patente: string; vehiculo: string;
  sena: number; estado: string; pago_estado: string; pago_metodo: string | null;
};

export async function turnoPorToken(token: string): Promise<TurnoPublico | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data, error } = await supabase.rpc("turno_publico", { p_token: token });
  if (error) throw error;
  return (data as TurnoPublico | null) ?? null;
}

export async function crearPreferencia(t: TurnoPublico, token: string, origen: string): Promise<string> {
  const vuelta = `${origen}/turnos/${token}`;
  const publico = origen.startsWith("https://"); // Mercado Pago solo avisa y redirige solo a direcciones públicas
  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ id: t.id, title: `Seña turno ALEZZA · ${SERVICIOS[t.servicio]} · ${t.fecha}`, quantity: 1, unit_price: Number(t.sena), currency_id: "ARS" }],
      external_reference: t.id,
      back_urls: { success: vuelta, pending: vuelta, failure: vuelta },
      ...(publico && { auto_return: "approved", notification_url: `${origen}/api/mercadopago/webhook` }),
      statement_descriptor: "ALEZZA",
    }),
    cache: "no-store",
  });
  const d = (await res.json().catch(() => ({}))) as { init_point?: string; message?: string };
  if (!res.ok || !d.init_point) throw new Error(d.message || `Mercado Pago respondió ${res.status}.`);
  return d.init_point;
}

// Lee el pago en Mercado Pago y, si está aprobado, confirma la seña del turno.
// La confirmación usa la clave de servidor: es la única forma de llamar a confirmar_pago_mp.
export async function verificarPago(pagoId: string, turnoEsperado?: string) {
  if (!/^\d{1,20}$/.test(pagoId)) return { estado: "invalido" as const };
  const res = await fetch(`${API}/v1/payments/${pagoId}`, { headers: auth(), cache: "no-store" });
  if (!res.ok) return { estado: "desconocido" as const };
  const p = (await res.json()) as { status?: string; external_reference?: string; transaction_amount?: number; currency_id?: string };
  if (!p.external_reference || (turnoEsperado && p.external_reference !== turnoEsperado)) return { estado: "ajeno" as const };
  if (p.status !== "approved" || p.currency_id !== "ARS") return { estado: (p.status ?? "desconocido") as string };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan las credenciales privadas de Supabase.");
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await admin.rpc("confirmar_pago_mp", { p_turno: p.external_reference, p_pago: pagoId, p_monto: p.transaction_amount ?? 0 });
  if (error) throw error;
  return { estado: "approved" as const };
}

export const origenDe = (request: Request) => process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
