import { createClient } from "@supabase/supabase-js";

// Verifica en el servidor que la solicitud venga de un administrador.
// Usa el JWT de la sesión del navegador (Authorization: Bearer) y la RLS
// existente de admin_users; no requiere la clave service_role.
export async function isAdminRequest(request: Request): Promise<boolean> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!token || !url || !key) return false;

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return false;

  const { data, error } = await client
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  return !error && !!data;
}

export function forbidden() {
  return Response.json({ error: "Acceso restringido a administradores." }, { status: 403 });
}

// Cliente de Supabase con la sesión del administrador (respeta RLS, sin service_role).
export function adminClient(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
