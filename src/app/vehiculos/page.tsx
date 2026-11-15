import Link from "next/link";
import Logo from "@/components/Logo";
import StockVehiculos, { readPublicProfile } from "@/components/StockVehiculos";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata = { title: "Vehículos en stock · ALEZZA" };

export default async function Vehiculos() {
  const { data } = await supabase.from("app_settings").select("value").eq("key", "public_profile").maybeSingle();

  return (
    <main className="min-h-screen bg-[var(--papel)] text-[var(--tinta)]">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/" aria-label="ALEZZA - Inicio"><Logo alto={26} /></Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-gray-600">
            <Link href="/financiacion" className="hover:text-[var(--tinta)]">Financiación</Link>
            <Link href="/simulador" className="rounded-lg bg-[var(--tinta)] px-4 py-2 font-semibold text-white hover:bg-[var(--n800)]">Simular permuta</Link>
          </nav>
        </div>
      </header>
      <StockVehiculos publicProfile={readPublicProfile(data?.value)} />
    </main>
  );
}
