import { supabase } from "@/lib/supabase";

type AdminActivity = {
  action: string;
  entityType: string;
  entityId?: string | null;
  changes?: Record<string, unknown> | null;
};

export async function logAdminActivity(activity: AdminActivity): Promise<boolean> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.warn("No se pudo identificar al administrador para el registro de actividad.");
      return false;
    }

    const { error } = await supabase.from("audit_logs").insert({
      actor_user_id: userData.user.id,
      action: activity.action,
      entity_type: activity.entityType,
      entity_id: activity.entityId ?? null,
      changes: activity.changes ?? null,
    });

    if (error) {
      console.warn("No se pudo guardar el registro de actividad:", error.message);
      return false;
    }

    return true;
  } catch {
    console.warn("No se pudo guardar el registro de actividad.");
    return false;
  }
}
