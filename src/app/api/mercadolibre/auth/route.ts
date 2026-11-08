import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const clientId = process.env.MERCADOLIBRE_CLIENT_ID;
  const redirectUri = process.env.MERCADOLIBRE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Faltan las credenciales o la URL de callback." },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();

  const response = NextResponse.redirect(
    `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`
  );

  response.cookies.set("ml_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
