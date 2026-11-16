import { SitioCabecera, SitioPie } from "@/components/SitioMarco";
import StockVehiculos, { readPublicProfile } from "@/components/StockVehiculos";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata = { title: "Vehículos en stock · ALEZZA" };

export default async function Vehiculos() {
  const { data } = await supabase.from("app_settings").select("value").eq("key", "public_profile").maybeSingle();
  const perfil = readPublicProfile(data?.value);

  return (
    <main className="lp min-h-screen">
      <SitioCabecera activa="/vehiculos" />
      <StockVehiculos publicProfile={perfil} />
      <SitioPie ubicacion={perfil.location} horario={perfil.business_hours} />
    </main>
  );
}
