import {
  getMercadoLibreAccessToken,
  getMercadoLibreConnectionStatus,
} from "@/lib/mercadolibre-token";
import { forbidden, isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

// Diagnóstico de la conexión. Nunca devuelve tokens.
// ?check=1 además obtiene un token válido (renovándolo si venció) y prueba /users/me.
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();

  try {
    const status = await getMercadoLibreConnectionStatus();
    const check = new URL(request.url).searchParams.get("check") === "1";

    if (!status.connected || !check) {
      return Response.json(status, { headers: { "Cache-Control": "no-store" } });
    }

    const token = await getMercadoLibreAccessToken();
    const probe = (path: string) =>
      fetch(`https://api.mercadolibre.com${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }).then((response) => response.status);

    // La búsqueda de publicaciones requiere un permiso que Mercado Libre otorga aparte.
    const [account, search] = await Promise.all([
      probe("/users/me"),
      probe("/sites/MLA/search?category=MLA1744&limit=1"),
    ]);

    return Response.json(
      {
        ...(await getMercadoLibreConnectionStatus()),
        api_check: {
          account_http_status: account,
          search_http_status: search,
          checked_at: new Date().toISOString(),
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo consultar el estado." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
