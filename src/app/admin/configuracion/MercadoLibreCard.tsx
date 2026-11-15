"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Status = {
  connected?: boolean;
  user_id?: number;
  access_expires_at?: string;
  access_valid?: boolean;
  api_check?: {
    account_http_status: number;
    search_http_status: number;
    checked_at: string;
  };
  error?: string;
};

const callbackMessages: Record<string, string> = {
  conectado: "Mercado Libre quedó conectado. Los tokens se guardaron cifrados.",
  rechazada: "La autorización fue cancelada o rechazada en Mercado Libre.",
  estado_invalido:
    "No se pudo validar la autorización. Iniciá la conexión desde esta misma dirección del panel.",
  token_invalido: "Mercado Libre no entregó un token válido. Revisá la aplicación en el DevCenter.",
  error: "No se pudo completar la conexión con Mercado Libre.",
};

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token ?? ""}` };
}

async function fetchStatus(check: boolean): Promise<Status> {
  try {
    const response = await fetch(`/api/mercadolibre/status${check ? "?check=1" : ""}`, {
      headers: await authHeaders(),
      cache: "no-store",
    });
    return (await response.json()) as Status;
  } catch {
    return { error: "No se pudo consultar el estado de Mercado Libre." };
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

function httpLabel(status: number) {
  if (status === 200) return "Disponible";
  if (status === 403) return "Bloqueado por Mercado Libre (403)";
  if (status === 401) return "Token rechazado (401)";
  return `Respuesta HTTP ${status}`;
}

export default function MercadoLibreCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  // La tarjeta sólo se monta en el navegador, después de validar al administrador.
  const [notice, setNotice] = useState(() => {
    if (typeof window === "undefined") return "";
    const result = new URLSearchParams(window.location.search).get("ml");
    return result ? callbackMessages[result] ?? "" : "";
  });

  async function load(check: boolean) {
    setBusy(true);
    setStatus(await fetchStatus(check));
    setBusy(false);
  }

  async function connect() {
    const confirmed = window.confirm(
      "Vas a reemplazar la conexión actual con Mercado Libre. ¿Continuar?"
    );
    if (!confirmed) return;

    setBusy(true);
    const response = await fetch("/api/mercadolibre/auth", {
      method: "POST",
      headers: await authHeaders(),
    });
    const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };

    if (!response.ok || !body.url) {
      setNotice(body.error ?? "No se pudo iniciar la conexión.");
      setBusy(false);
      return;
    }

    window.location.href = body.url;
  }

  useEffect(() => {
    if (window.location.search.includes("ml=")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    let active = true;
    void fetchStatus(false).then((result) => {
      if (active) setStatus(result);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="max-w-3xl rounded-2xl border border-white/10 bg-white/[0.04] p-5 md:p-7">
      <h2 className="text-xl font-semibold">Integración con Mercado Libre</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Los tokens se guardan cifrados en el servidor y nunca se muestran en el navegador.
      </p>

      {notice && (
        <p role="status" className="mt-5 rounded-lg border border-sky-400/20 bg-sky-400/10 p-3 text-sm text-sky-200">
          {notice}
        </p>
      )}

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        {!status ? (
          <p className="text-slate-400">Consultando estado...</p>
        ) : status.error ? (
          <p className="text-red-400 sm:col-span-2">{status.error}</p>
        ) : !status.connected ? (
          <p className="text-amber-300 sm:col-span-2">No hay una cuenta conectada.</p>
        ) : (
          <>
            <div>
              <dt className="text-slate-400">Cuenta</dt>
              <dd className="mt-1 font-semibold">Conectada · usuario {status.user_id}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Token de acceso</dt>
              <dd className="mt-1">
                {status.access_valid ? "Vigente" : "Vencido (se renueva al usarlo)"} · vence{" "}
                {status.access_expires_at && formatDate(status.access_expires_at)}
              </dd>
            </div>
            {status.api_check && (
              <>
                <div>
                  <dt className="text-slate-400">API de cuenta (/users/me)</dt>
                  <dd className="mt-1">{httpLabel(status.api_check.account_http_status)}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Búsqueda de publicaciones</dt>
                  <dd className="mt-1">{httpLabel(status.api_check.search_http_status)}</dd>
                </div>
                <p className="text-xs text-slate-500 sm:col-span-2">
                  Verificado: {formatDate(status.api_check.checked_at)}
                </p>
              </>
            )}
          </>
        )}
      </dl>

      {status?.api_check?.search_http_status === 403 && (
        <p className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
          Mercado Libre no habilitó la búsqueda ni la lectura de publicaciones para esta aplicación.
          Hasta que lo haga, los comparables se cargan de forma asistida en Referencias.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={busy}
          className="rounded-lg bg-sky-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
        >
          {busy ? "Verificando..." : "Verificar conexión"}
        </button>
        <button
          type="button"
          onClick={() => void connect()}
          disabled={busy}
          className="rounded-lg border border-white/15 px-5 py-3 text-sm hover:bg-white/10 disabled:opacity-50"
        >
          {status?.connected ? "Reconectar cuenta" : "Conectar cuenta"}
        </button>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Para conectar, abrí este panel desde la misma dirección pública configurada como callback en Mercado Libre.
      </p>
    </section>
  );
}
