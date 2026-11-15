import { NextResponse } from "next/server";
import { forbidden, isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

// POST (no GET): sólo un administrador autenticado puede iniciar la conexión.
// Devuelve la URL de autorización y el panel navega a ella.
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();

  const clientId = process.env.MERCADOLIBRE_CLIENT_ID;
  const redirectUri = process.env.MERCADOLIBRE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Faltan las credenciales o la URL de callback." },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();

  const response = NextResponse.json({
    url: `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`,
  });

  response.cookies.set("ml_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
