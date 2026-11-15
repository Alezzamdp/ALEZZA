"use client";

import { type FormEvent, useEffect, useState } from "react";
import { ui } from "@/components/AdminGate";
import { supabase } from "@/lib/supabase";
import { CONFIG_INICIAL, EXTRAS, SERVICIOS, type Extra, type Servicio, type TurnosConfig } from "@/lib/turnos";

const CON_PRECIO: [Servicio | Extra, string][] = [
  ...(["lavado", "puesta", "agencia"] as Servicio[]).map((k) => [k, SERVICIOS[k]] as [Servicio, string]),
  ...(Object.keys(EXTRAS) as Extra[]).map((k) => [k, EXTRAS[k]] as [Extra, string]),
];

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Días, cupo y seña de los turnos online, y los datos para transferir (se muestran al cliente).
export default function TurnosCard() {
  const [c, setC] = useState<TurnosConfig>(CONFIG_INICIAL);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "turnos").maybeSingle()
      .then(({ data }) => { if (data?.value) setC({ ...CONFIG_INICIAL, ...(data.value as Partial<TurnosConfig>) }); });
  }, []);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const value: TurnosConfig = {
      ...c,
      cupo: Math.max(1, Math.min(50, Math.round(c.cupo))),
      sena: Math.max(0, Math.round(c.sena)),
      porcentaje_sena: Math.max(0, Math.min(100, Math.round(c.porcentaje_sena))),
      precios: Object.fromEntries(CON_PRECIO.map(([k]) => [k, Math.max(0, Math.round(Number(c.precios[k]) || 0))])),
      anticipacion: Math.max(0, Math.min(30, Math.round(c.anticipacion))),
      horizonte: Math.max(7, Math.min(180, Math.round(c.horizonte))),
      alias: c.alias.trim().slice(0, 60), cbu: c.cbu.replace(/\s/g, "").slice(0, 30), titular: c.titular.trim().slice(0, 80),
    };
    const { error } = await supabase.from("app_settings").upsert({ key: "turnos", value, updated_at: new Date().toISOString() });
    setAviso(error ? "No se pudo guardar: " + error.message : "Turnos guardados.");
  }

  const num = (k: "cupo" | "sena" | "porcentaje_sena" | "anticipacion" | "horizonte", etiqueta: string) => (
    <div>
      <label className={ui.etiqueta} htmlFor={`t-${k}`}>{etiqueta}</label>
      <input id={`t-${k}`} type="number" min={0} value={c[k]} onChange={(e) => setC({ ...c, [k]: Number(e.target.value) })} className={ui.campo} />
    </div>
  );
  const txt = (k: "alias" | "cbu" | "titular", etiqueta: string) => (
    <div>
      <label className={ui.etiqueta} htmlFor={`t-${k}`}>{etiqueta}</label>
      <input id={`t-${k}`} value={c[k]} onChange={(e) => setC({ ...c, [k]: e.target.value })} className={ui.campo} />
    </div>
  );

  return (
    <form onSubmit={guardar} className={`${ui.tarjeta} mt-6 grid gap-4 p-6 text-[var(--tinta)]`}>
      <div>
        <h2 className="text-xl font-semibold">Turnos online</h2>
        <p className="text-sm text-[var(--n500)]">Lo que el cliente ve en /turnos. Mercado Pago se habilita cargando MERCADOPAGO_ACCESS_TOKEN en el servidor.</p>
      </div>
      <fieldset>
        <legend className={ui.etiqueta}>Días que se toman turnos</legend>
        <div className="flex flex-wrap gap-2">
          {DIAS.map((d, i) => {
            const n = i + 1, on = c.dias.includes(n);
            return (
              <button key={d} type="button" aria-pressed={on} onClick={() => setC({ ...c, dias: on ? c.dias.filter((x) => x !== n) : [...c.dias, n].sort() })}
                className={`rounded-full border px-3 py-1 text-sm ${on ? "border-[var(--tinta)] bg-[var(--tinta)] text-[var(--papel)]" : "border-[var(--n300)]"}`}>{d}</button>
            );
          })}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-5">
        {num("cupo", "Autos por día")}
        {num("porcentaje_sena", "Seña (% del precio)")}
        {num("sena", "Seña si es a cotizar ($)")}
        {num("anticipacion", "Días de anticipación")}
        {num("horizonte", "Días hacia adelante")}
      </div>
      <fieldset>
        <legend className={ui.etiqueta}>Precios (0 = a cotizar)</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CON_PRECIO.map(([k, t]) => (
            <div key={k}>
              <label className="mb-1 block text-xs text-[var(--n600)]" htmlFor={`p-${k}`}>{t}</label>
              <input id={`p-${k}`} type="number" min={0} step={1000} value={c.precios[k] ?? 0}
                onChange={(e) => setC({ ...c, precios: { ...c.precios, [k]: Number(e.target.value) } })} className={ui.campo} />
            </div>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        {txt("alias", "Alias")}
        {txt("cbu", "CBU / CVU")}
        {txt("titular", "Titular")}
      </div>
      <div className="flex items-center gap-3">
        <button className={ui.boton}>Guardar turnos</button>
        {aviso && <span role="status" className="text-sm">{aviso}</span>}
      </div>
    </form>
  );
}
