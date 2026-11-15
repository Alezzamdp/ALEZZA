import { NextRequest, NextResponse } from "next/server";
import { saveMercadoLibreTokens } from "@/lib/mercadolibre-token";

export const runtime = "nodejs";

// Vuelve al panel de Configuración con el resultado, sin exponer datos.
function backToSettings(result: string) {
  const target = new URL("/admin/configuracion", process.env.MERCADOLIBRE_REDIRECT_URI);
  target.searchParams.set("ml", result);
  const response = NextResponse.redirect(target);
  response.cookies.delete("ml_oauth_state");
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const savedState = request.cookies.get("ml_oauth_state")?.value;
  const error = searchParams.get("error");

  const clientId = process.env.MERCADOLIBRE_CLIENT_ID;
  const clientSecret = process.env.MERCADOLIBRE_CLIENT_SECRET;
  const redirectUri = process.env.MERCADOLIBRE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: "Falta configurar alguna credencial de Mercado Libre." },
      { status: 500 }
    );
  }

  if (error) return backToSettings("rechazada");

  if (
    !code ||
    !returnedState ||
    !savedState ||
    returnedState !== savedState
  ) {
    return backToSettings("estado_invalido");
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
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
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
      console.error(
        "Error al intercambiar el código de Mercado Libre.",
        {
          httpStatus: tokenResponse.status,
          error: tokenData.error ?? "desconocido",
          error_description:
            tokenData.error_description ?? "Sin descripción",
        }
      );

      return backToSettings("token_invalido");
    }

    await saveMercadoLibreTokens({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      user_id: tokenData.user_id,
      expires_at: Date.now() + tokenData.expires_in * 1000,
    });

    return backToSettings("conectado");
  } catch (error) {
    console.error(
      "Error interno al completar la conexión de Mercado Libre:",
      error instanceof Error ? error.message : "Error desconocido"
    );

    return backToSettings("error");
  }
}
