import { NextRequest, NextResponse } from "next/server";
import { saveMercadoLibreTokens } from "@/lib/mercadolibre-token";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const savedState = request.cookies.get("ml_oauth_state")?.value;
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json(
      { error: "Mercado Libre rechazó la autorización." },
      { status: 400 }
    );
  }

  if (!code || !returnedState || !savedState || returnedState !== savedState) {
    return NextResponse.json(
      { error: "Autorización incompleta o estado inválido." },
      { status: 400 }
    );
  }

  const clientId = process.env.MERCADOLIBRE_CLIENT_ID;
  const clientSecret = process.env.MERCADOLIBRE_CLIENT_SECRET;
  const redirectUri = process.env.MERCADOLIBRE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: "Falta configurar alguna credencial de Mercado Libre." },
      { status: 500 }
    );
  }

  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch(
      "https://api.mercadolibre.com/oauth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        cache: "no-store",
      }
    );

    const tokenData = await tokenResponse.json();

    if (
      !tokenResponse.ok ||
      !tokenData.access_token ||
      !tokenData.refresh_token ||
      !tokenData.expires_in
    ) {
      console.error("Error al intercambiar el código de Mercado Libre.");
      return NextResponse.json(
        { error: "No se pudo obtener un token válido de Mercado Libre." },
        { status: 502 }
      );
    }

    await saveMercadoLibreTokens({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      user_id: tokenData.user_id,
      expires_at: Date.now() + tokenData.expires_in * 1000,
    });

    const response = NextResponse.json({
      connected: true,
      message: "Mercado Libre conectado. Tokens guardados cifrados.",
      user_id: tokenData.user_id,
    });

    response.cookies.delete("ml_oauth_state");
    return response;
  } catch (error) {
    console.error(
      "Error interno al completar la conexión de Mercado Libre:",
      error instanceof Error ? error.message : "Error desconocido"
    );

    return NextResponse.json(
      { error: "No se pudo completar la conexión de Mercado Libre." },
      { status: 500 }
    );
  }
}
