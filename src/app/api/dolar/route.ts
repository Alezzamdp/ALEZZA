import { dolar } from "@/lib/dolar";

// Dólar oficial y blue de hoy para el Inicio de BRUNO OS (dato público; dolar.ts lo cachea 1 hora).
export async function GET() {
  const [oficial, blue] = await Promise.all([dolar("oficial"), dolar("blue")]);
  return Response.json({ oficial, blue }, { headers: { "Cache-Control": "public, max-age=600" } });
}
