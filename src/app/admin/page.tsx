"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import MarketSummary from "@/components/MarketSummary";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import Logo from "@/components/Logo";
import Cargando from "@/components/Cargando";

type Followup = {
  id: string;
  opportunity_id: string;
  actor_user_id: string | null;
  type: string;
  content: string;
  created_at: string;
};

type Appraisal = {
  id: string;
  opportunity_id: string;
  market_value_min: number | null;
  market_value_max: number | null;
  estimated_take_value: number | null;
  approved_take_value: number | null;
  currency: string;
  explanation: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
};

type AppraisalComparable = {
  id: string;
  appraisal_id: string;
  brand: string;
  model: string;
  version: string | null;
  year: number | null;
  kilometers: number | null;
  location: string | null;
  listing_url: string | null;
  source: string | null;
  published_price: number | null;
  currency: string;
  published_at: string | null;
  observed_at: string;
  listing_status: string | null;
  notes: string | null;
};

type OpportunityStatus =
  | "new"
  | "analyzed"
  | "pending_review"
  | "approved"
  | "contacted"
  | "inspection_scheduled"
  | "negotiation"
  | "completed"
  | "discarded";

type Opportunity = {
  id: string;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  customer_notes: string | null;
  desired_vehicle_id: string | null;
  desired_vehicle: {
    id: string;
    brand: string;
    model: string;
    version: string | null;
    year: number;
  } | null;
  status: OpportunityStatus;
  created_at: string;
  internal_notes?: string | null;
  estimated_value?: number | null;
  approved_value?: number | null;
  final_offer?: number | null;
  valuation_notes?: string | null;
  next_followup_date?: string | null;
  next_followup_note?: string | null;
  trade_vehicle: {
    brand?: string;
    model?: string;
    version?: string;
    year?: number | string;
    kilometers?: number | string;
    fuel?: string;
    transmission?: string;
    condition?: string;
    notes?: string;
    photos?: Record<string, string>;
  };
};

const statuses: { value: OpportunityStatus; label: string }[] = [
  { value: "new", label: "Nueva" },
  { value: "analyzed", label: "Analizada" },
  { value: "pending_review", label: "Pendiente de revisión" },
  { value: "approved", label: "Aprobada" },
  { value: "contacted", label: "Contactado" },
  { value: "inspection_scheduled", label: "Inspección coordinada" },
  { value: "negotiation", label: "En negociación" },
  { value: "completed", label: "Concretada" },
  { value: "discarded", label: "Descartada" },
];

function isClosedOpportunity(status: OpportunityStatus) {
  return status === "completed" || status === "discarded";
}

function getEmailUrl(email: string) {
  const recipient = encodeURIComponent(email).replace(/%40/i, "@");
  const subject = encodeURIComponent("Seguimiento de tu solicitud de permuta - ALEZZA");
  return `mailto:${recipient}?subject=${subject}`;
}

function getOpportunityWriteErrorMessage(
  action: string,
  error: { code?: string; message: string }
) {
  if (isMissingFollowupSchemaError(error)) {
    return "Falta actualizar el esquema de seguimiento en Supabase. Ejecutá las migraciones 202611070003 a 202611070006, en ese orden, desde supabase/migrations y volvé a intentar.";
  }

  return `${action}: ${error.message}`;
}

function isMissingFollowupSchemaError(error: { code?: string; message: string }) {
  return (
    error.code === "42703" &&
    /next_followup_(date|note)/i.test(error.message)
  );
}

function isMissingVehicleInquirySchemaError(error: { code?: string; message: string }) {
  return (
    (error.code === "PGRST205" || error.code === "42P01") &&
    /vehicle_inquiries/i.test(error.message)
  );
}

function getLocalDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

function formatDateOnly(value: string | null) {
  if (!value) return "No informada";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function formatAppraisalDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

function formatAppraisalMoney(value: number | null, currency: string) {
  if (value == null) return "—";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function loadComparablesForAppraisals(appraisalIds: string[]) {
  return supabase
    .from("comparables")
    .select("id, appraisal_id, brand, model, version, year, kilometers, location, listing_url, source, published_price, currency, published_at, observed_at, listing_status, notes")
    .in("appraisal_id", appraisalIds)
    .order("observed_at", { ascending: false });
}

const photoLabels: Record<string, string> = {
  front: "Frente",
  rear: "Parte trasera",
  left: "Lateral izquierdo",
  right: "Lateral derecho",
  interior: "Interior",
  dashboard: "Tablero y kilometraje",
};

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [newVehicleInquiryCount, setNewVehicleInquiryCount] = useState<number | null>(null);
  const [vehicleInquiryCountUnavailableReason, setVehicleInquiryCountUnavailableReason] = useState<string | null>(null);
  const [followupSchemaAvailable, setFollowupSchemaAvailable] = useState<boolean | null>(null);
  const [followupSchemaCheckFailed, setFollowupSchemaCheckFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFollowup, setFilterFollowup] = useState("all");
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loadingPhotoUrls, setLoadingPhotoUrls] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [selectedAppraisal, setSelectedAppraisal] = useState<Appraisal | null>(null);
  const [appraisalHistory, setAppraisalHistory] = useState<Appraisal[]>([]);
  const [appraisalComparables, setAppraisalComparables] = useState<AppraisalComparable[]>([]);
  const [loadingAppraisal, setLoadingAppraisal] = useState(false);
  const [loadingAppraisalComparables, setLoadingAppraisalComparables] = useState(false);
  const [savingAppraisal, setSavingAppraisal] = useState(false);
  const [savingNegotiation, setSavingNegotiation] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [appraisalCurrency, setAppraisalCurrency] = useState<"ARS" | "USD">("ARS");
  const [marketValueMin, setMarketValueMin] = useState("");
  const [marketValueMax, setMarketValueMax] = useState("");
  const [estimatedTakeValue, setEstimatedTakeValue] = useState("");
  const [approvedValue, setApprovedValue] = useState("");
  const [finalOffer, setFinalOffer] = useState("");
  const [valuationNotes, setValuationNotes] = useState("");
  const [nextFollowupDate, setNextFollowupDate] = useState("");
  const [nextFollowupNote, setNextFollowupNote] = useState("");
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [followupType, setFollowupType] = useState("note");
  const [followupContent, setFollowupContent] = useState("");
  const [savingFollowup, setSavingFollowup] = useState(false);
  const [loadingFollowups, setLoadingFollowups] = useState(false);

  const selected = opportunities.find((item) => item.id === selectedId);
  const selectedPhotoPaths = selected?.trade_vehicle?.photos;
  const selectedWhatsAppUrl = selected?.phone
    ? getWhatsAppUrl(
        selected.phone,
        `Hola${selected.customer_name ? " " + selected.customer_name.split(" ")[0] : ""}, te escribimos de ALEZZA por tu consulta de permuta${
          selected.trade_vehicle?.brand ? ` de tu ${[selected.trade_vehicle.brand, selected.trade_vehicle.model, selected.trade_vehicle.year].filter(Boolean).join(" ")}` : ""
        }${selected.desired_vehicle ? ` por el ${selected.desired_vehicle.brand} ${selected.desired_vehicle.model} ${selected.desired_vehicle.year}` : ""}.`
      )
    : null;

  useEffect(() => {
    let active = true;

    async function loadSelectedAppraisal() {
      if (!selected) {
        setSelectedAppraisal(null);
        setAppraisalHistory([]);
        setAppraisalComparables([]);
        setLoadingAppraisal(false);
        setLoadingAppraisalComparables(false);
        setInternalNotes("");
        setAppraisalCurrency("ARS");
        setMarketValueMin("");
        setMarketValueMax("");
        setEstimatedTakeValue("");
        setApprovedValue("");
        setFinalOffer("");
        setValuationNotes("");
        setNextFollowupDate("");
        setNextFollowupNote("");
        return;
      }

      setLoadingAppraisal(true);
      setSelectedAppraisal(null);
      setAppraisalHistory([]);
      setAppraisalComparables([]);
      setLoadingAppraisalComparables(false);
      setAppraisalCurrency("ARS");
      setMarketValueMin("");
      setMarketValueMax("");
      setEstimatedTakeValue("");
      setApprovedValue(selected.approved_value != null ? String(selected.approved_value) : "");
      setValuationNotes(selected.valuation_notes ?? "");
      setInternalNotes(selected.internal_notes ?? "");
      setFinalOffer(selected.final_offer != null ? String(selected.final_offer) : "");
      setNextFollowupDate(
        isClosedOpportunity(selected.status) ? "" : selected.next_followup_date ?? ""
      );
      setNextFollowupNote(
        isClosedOpportunity(selected.status) ? "" : selected.next_followup_note ?? ""
      );

      const { data, error } = await supabase
        .from("appraisals")
        .select("id, opportunity_id, market_value_min, market_value_max, estimated_take_value, approved_take_value, currency, explanation, approved_by, approved_at, created_at")
        .eq("opportunity_id", selected.id)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        setMessage("No se pudo cargar la tasación: " + error.message);
        setSelectedAppraisal(null);
        setAppraisalHistory([]);
        setAppraisalComparables([]);
        setLoadingAppraisalComparables(false);
        setAppraisalCurrency("ARS");
        setMarketValueMin("");
        setMarketValueMax("");
        setEstimatedTakeValue("");
        setApprovedValue(selected.approved_value != null ? String(selected.approved_value) : "");
        setValuationNotes(selected.valuation_notes ?? "");
        setLoadingAppraisal(false);
        return;
      }

      const history = (data ?? []) as Appraisal[];
      const appraisal = history[0] ?? null;
      const appraisalIds = history.map((entry) => entry.id);

      if (appraisalIds.length > 0) {
        setLoadingAppraisalComparables(true);
        const { data: comparableData, error: comparableError } =
          await loadComparablesForAppraisals(appraisalIds);

        if (!active) return;
        setLoadingAppraisalComparables(false);

        if (comparableError) {
          setMessage("Se cargó el historial de tasaciones, pero no sus referencias: " + comparableError.message);
        } else {
          setAppraisalComparables((comparableData ?? []) as AppraisalComparable[]);
        }
      } else {
        setAppraisalComparables([]);
      }

      setSelectedAppraisal(appraisal);
      setAppraisalHistory(history);
      setAppraisalCurrency(appraisal?.currency === "USD" ? "USD" : "ARS");
      setMarketValueMin(appraisal?.market_value_min != null ? String(appraisal.market_value_min) : "");
      setMarketValueMax(appraisal?.market_value_max != null ? String(appraisal.market_value_max) : "");
      setEstimatedTakeValue(appraisal?.estimated_take_value != null ? String(appraisal.estimated_take_value) : "");
      setApprovedValue(
        appraisal
          ? appraisal.approved_take_value != null
            ? String(appraisal.approved_take_value)
            : ""
          : selected.approved_value != null
            ? String(selected.approved_value)
            : ""
      );
      setValuationNotes(
        appraisal ? appraisal.explanation ?? "" : selected.valuation_notes ?? ""
      );
      setLoadingAppraisal(false);
    }

    void loadSelectedAppraisal();

    return () => {
      active = false;
    };
  }, [selectedId, selected]);

  async function refreshAppraisalComparables() {
    const appraisalIds = appraisalHistory.map((entry) => entry.id);
    if (appraisalIds.length === 0 || loadingAppraisalComparables) return;

    setLoadingAppraisalComparables(true);
    const { data, error } = await loadComparablesForAppraisals(appraisalIds);
    if (error) {
      setMessage("No se pudieron actualizar las referencias vinculadas: " + error.message);
    } else {
      setAppraisalComparables((data ?? []) as AppraisalComparable[]);
    }
    setLoadingAppraisalComparables(false);
  }

  const filteredOpportunities = useMemo(() => {
    const today = getLocalDateKey();
    const filtered = opportunities.filter((item) => {
      const vehicle = item.trade_vehicle ?? {};
      const term = search.trim().toLowerCase();

      const matchesSearch =
        !term ||
        [
          item.customer_name,
          item.phone,
          item.email,
          item.desired_vehicle?.brand,
          item.desired_vehicle?.model,
          item.desired_vehicle?.version,
          vehicle.brand,
          vehicle.model,
          vehicle.version,
          vehicle.year,
          item.next_followup_note,
        ].some((value) => String(value ?? "").toLowerCase().includes(term));

      const matchesStatus =
        filterStatus === "all" || item.status === filterStatus;

      const followupDate = item.next_followup_date;
      const isOpenOpportunity = !isClosedOpportunity(item.status);
      const hasActiveFollowup = isOpenOpportunity && Boolean(followupDate);
      const matchesFollowup =
        filterFollowup === "all" ||
        (filterFollowup === "overdue" && hasActiveFollowup && Boolean(followupDate && followupDate < today)) ||
        (filterFollowup === "today" && hasActiveFollowup && followupDate === today) ||
        (filterFollowup === "scheduled" && hasActiveFollowup && Boolean(followupDate && followupDate > today)) ||
        (filterFollowup === "none" && isOpenOpportunity && !followupDate);

      return matchesSearch && matchesStatus && matchesFollowup;
    });

    if (["overdue", "today", "scheduled"].includes(filterFollowup)) {
      filtered.sort((a, b) =>
        (a.next_followup_date ?? "9999-12-31").localeCompare(
          b.next_followup_date ?? "9999-12-31"
        )
      );
    }

    return filtered;
  }, [opportunities, search, filterStatus, filterFollowup]);

  const loadOpportunities = useCallback(async () => {
    const [opportunitiesResult, followupSchemaResult, vehicleInquiriesResult] = await Promise.all([
      supabase
        .from("opportunities")
        .select("*, desired_vehicle:vehicles!opportunities_desired_vehicle_id_fkey(id, brand, model, version, year)")
        .order("created_at", { ascending: false }),
      supabase
        .from("opportunities")
        .select("next_followup_date,next_followup_note")
        .limit(0),
      supabase
        .from("vehicle_inquiries")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
    ]);

    if (vehicleInquiriesResult.error) {
      setNewVehicleInquiryCount(null);
      setVehicleInquiryCountUnavailableReason(
        isMissingVehicleInquirySchemaError(vehicleInquiriesResult.error)
          ? "Aplicá la migración 009"
          : "No se pudo consultar"
      );
    } else {
      setNewVehicleInquiryCount(vehicleInquiriesResult.count ?? 0);
      setVehicleInquiryCountUnavailableReason(null);
    }

    if (followupSchemaResult.error) {
      if (isMissingFollowupSchemaError(followupSchemaResult.error)) {
        setFollowupSchemaAvailable(false);
        setFollowupSchemaCheckFailed(false);
        setFilterFollowup("all");
      } else {
        setFollowupSchemaAvailable(null);
        setFollowupSchemaCheckFailed(true);
      }
    } else {
      setFollowupSchemaAvailable(true);
      setFollowupSchemaCheckFailed(false);
    }

    if (opportunitiesResult.error) {
      setMessage("No se pudieron cargar las oportunidades: " + opportunitiesResult.error.message);
      return;
    }

    setOpportunities((opportunitiesResult.data ?? []) as Opportunity[]);
  }, []);

  const verifyAdmin = useCallback(async (userId: string, currentEmail: string) => {
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      setIsAdmin(false);
      setUserEmail(currentEmail);
      setMessage("Esta cuenta no tiene permisos de administrador.");
      return false;
    }

    setUserEmail(currentEmail);
    setIsAdmin(true);
    setMessage("");
    await loadOpportunities();
    return true;
  }, [loadOpportunities]);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (data.session?.user) {
        await verifyAdmin(
          data.session.user.id,
          data.session.user.email ?? ""
        );
      }

      setLoading(false);
    }

    checkSession();
  }, [verifyAdmin]);

  useEffect(() => {
    let active = true;
    let refreshTimer: ReturnType<typeof setInterval> | undefined;

    async function loadPhotoUrls() {
      if (!selectedPhotoPaths) {
        setPhotoUrls({});
        setLoadingPhotoUrls(false);
        return;
      }

      setLoadingPhotoUrls(true);
      const entries = Object.entries(selectedPhotoPaths);

      const results = await Promise.all(
        entries.map(async ([key, path]) => {
          if (!path) return [key, ""] as const;

          try {
            const { data, error } = await supabase.storage
              .from("trade-vehicle-photos")
              .createSignedUrl(path, 1800);

            if (error || !data?.signedUrl) {
              return [key, ""] as const;
            }

            return [key, data.signedUrl] as const;
          } catch {
            return [key, ""] as const;
          }
        })
      );

      if (active) {
        setPhotoUrls(Object.fromEntries(results));
        setLoadingPhotoUrls(false);
      }
    }

    void loadPhotoUrls();

    if (selectedPhotoPaths) {
      refreshTimer = setInterval(() => {
        void loadPhotoUrls();
      }, 25 * 60 * 1000);
    }

    return () => {
      active = false;
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [selectedId, selectedPhotoPaths]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setMessage("No se pudo iniciar sesión. Revisá el correo y la contraseña.");
      setBusy(false);
      return;
    }

    const verified = await verifyAdmin(
      data.user.id,
      data.user.email ?? ""
    );

    if (!verified) {
      await supabase.auth.signOut();
    }

    setPassword("");
    setBusy(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setUserEmail("");
    setPassword("");
    setOpportunities([]);
    setSelectedId(null);
    setMessage("");
  }

  async function updateStatus(nextStatus: OpportunityStatus) {
    if (!selected || savingStatus) return;

    if (nextStatus !== selected.status && isClosedOpportunity(nextStatus)) {
      const action = nextStatus === "completed" ? "concretar" : "descartar";
      const followupNotice = selected.next_followup_date
        ? ` También se va a limpiar el seguimiento programado para el ${formatDateOnly(selected.next_followup_date)}.`
        : "";

      if (
        !window.confirm(
          `¿Querés ${action} esta oportunidad?${followupNotice} Esta acción la va a cerrar.`
        )
      ) {
        return;
      }
    }

    setSavingStatus(true);
    setMessage("");

    const previousStatus = selected.status;
    const closeFollowup = isClosedOpportunity(nextStatus);
    const clearedFollowupDate = closeFollowup ? selected.next_followup_date ?? null : null;
    const updates = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
      ...(closeFollowup
        ? { next_followup_date: null, next_followup_note: null }
        : {}),
    };

    const result = await supabase
      .from("opportunities")
      .update(updates)
      .eq("id", selected.id);
    let error = result.error;
    let followupSchemaUnavailable = false;

    if (error && closeFollowup && isMissingFollowupSchemaError(error)) {
      followupSchemaUnavailable = true;
      const fallbackResult = await supabase
        .from("opportunities")
        .update({ status: nextStatus, updated_at: updates.updated_at })
        .eq("id", selected.id);
      error = fallbackResult.error;
    }

    if (error) {
      setMessage(getOpportunityWriteErrorMessage("No se pudo actualizar el estado", error));
      setSavingStatus(false);
      return;
    }

    setOpportunities((current) =>
      current.map((item) =>
        item.id === selected.id
          ? {
              ...item,
              ...(followupSchemaUnavailable
                ? { status: nextStatus, updated_at: updates.updated_at }
                : updates),
            }
          : item
      )
    );
    if (closeFollowup) {
      setNextFollowupDate("");
      setNextFollowupNote("");
    }

    const { data: userData } = await supabase.auth.getUser();

    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_user_id: userData.user?.id ?? null,
      action: "opportunity_status_changed",
      entity_type: "opportunity",
      entity_id: selected.id,
      changes: {
        previous_status: previousStatus,
        new_status: nextStatus,
        ...(followupSchemaUnavailable
          ? { followup_schedule_cleared: false, schema_update_required: true }
          : { cleared_followup_date: clearedFollowupDate }),
      },
    });

    if (auditError) {
      console.warn("No se pudo guardar el registro de auditoría:", auditError.message);
    }

    setMessage(
      followupSchemaUnavailable
        ? auditError
          ? "Estado actualizado. Falta aplicar las migraciones de seguimiento y no se pudo guardar el registro de actividad."
          : "Estado actualizado. Aplicá las migraciones 202611070003 a 202611070006 para asegurar la limpieza del seguimiento programado."
        : auditError
          ? "Estado actualizado, pero no se pudo guardar el registro de actividad."
          : "Estado actualizado correctamente."
    );
    setSavingStatus(false);
  }

  useEffect(() => {
    let active = true;

    async function loadFollowups() {
      if (!selectedId) {
        setFollowups([]);
        return;
      }

      setLoadingFollowups(true);

      const { data, error } = await supabase
        .from("opportunity_followups")
        .select("*")
        .eq("opportunity_id", selectedId)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        setMessage("No se pudo cargar el historial: " + error.message);
        setFollowups([]);
      } else {
        setFollowups((data ?? []) as Followup[]);
      }

      setLoadingFollowups(false);
    }

    loadFollowups();

    return () => {
      active = false;
    };
  }, [selectedId]);

  async function addFollowup() {
    if (!selected || !followupContent.trim() || savingFollowup) return;

    setSavingFollowup(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("opportunity_followups")
      .insert({
        opportunity_id: selected.id,
        actor_user_id: userData.user?.id ?? null,
        type: followupType,
        content: followupContent.trim(),
      })
      .select("*")
      .single();

    if (error) {
      setMessage("No se pudo guardar el seguimiento: " + error.message);
      setSavingFollowup(false);
      return;
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_user_id: userData.user?.id ?? null,
      action: "opportunity_followup_added",
      entity_type: "opportunity",
      entity_id: selected.id,
      changes: {
        followup_id: (data as Followup).id,
        followup_type: followupType,
      },
    });

    if (auditError) {
      console.warn("No se pudo guardar el registro de actividad:", auditError.message);
    }

    setFollowups((current) => [data as Followup, ...current]);
    setFollowupContent("");
    setFollowupType("note");
    setMessage(
      auditError
        ? "Seguimiento registrado, pero no se pudo guardar el registro de actividad."
        : "Seguimiento registrado correctamente."
    );
    setSavingFollowup(false);
  }

  async function saveAppraisal() {
    if (!selected || savingAppraisal || loadingAppraisal) return;

    const rawValues = [marketValueMin, marketValueMax, estimatedTakeValue, approvedValue];
    if (rawValues.some((value) => value.trim() !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0))) {
      setMessage("Los valores de tasación deben ser números válidos y no pueden ser negativos.");
      return;
    }

    const minimum = marketValueMin.trim() ? Number(marketValueMin) : null;
    const maximum = marketValueMax.trim() ? Number(marketValueMax) : null;
    if (minimum !== null && maximum !== null && maximum < minimum) {
      setMessage("El límite superior del rango debe ser igual o mayor al inferior.");
      return;
    }

    setSavingAppraisal(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();
    const approvedTake = approvedValue.trim() === "" ? null : Number(approvedValue);
    const savedAt = new Date().toISOString();
    const payload = {
      opportunity_id: selected.id,
      market_value_min: minimum,
      market_value_max: maximum,
      estimated_take_value: estimatedTakeValue.trim() === "" ? null : Number(estimatedTakeValue),
      approved_take_value: approvedTake,
      currency: appraisalCurrency,
      explanation: valuationNotes.trim() || null,
      approved_by: approvedTake === null ? null : userData.user?.id ?? null,
      approved_at: approvedTake === null ? null : savedAt,
    };

    const result = await supabase
      .from("appraisals")
      .insert(payload)
      .select("id, opportunity_id, market_value_min, market_value_max, estimated_take_value, approved_take_value, currency, explanation, approved_by, approved_at, created_at")
      .single();

    if (result.error || !result.data) {
      setMessage("No se pudo guardar la tasación: " + (result.error?.message ?? "No se recibió el registro guardado."));
      setSavingAppraisal(false);
      return;
    }

    const savedAppraisal = result.data as Appraisal;
    setSelectedAppraisal(savedAppraisal);
    setAppraisalHistory((current) => [savedAppraisal, ...current]);

    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_user_id: userData.user?.id ?? null,
      action: selectedAppraisal
        ? "opportunity_appraisal_revision_created"
        : "opportunity_appraisal_created",
      entity_type: "opportunity",
      entity_id: selected.id,
      changes: {
        currency: {
          from: selectedAppraisal?.currency ?? "ARS",
          to: appraisalCurrency,
        },
        market_value_min: { from: selectedAppraisal?.market_value_min ?? null, to: minimum },
        market_value_max: { from: selectedAppraisal?.market_value_max ?? null, to: maximum },
        estimated_take_value: {
          from: selectedAppraisal?.estimated_take_value ?? null,
          to: payload.estimated_take_value,
        },
        approved_take_value: {
          from: selectedAppraisal
            ? selectedAppraisal.approved_take_value
            : selected.approved_value ?? null,
          to: approvedTake,
        },
      },
    });

    if (auditError) {
      console.warn("No se pudo guardar el registro de actividad:", auditError.message);
    }

    setMessage(
      auditError
        ? "Tasación guardada, pero no se pudo guardar el registro de actividad."
        : "Tasación guardada correctamente."
    );
    setSavingAppraisal(false);
  }

  async function saveNegotiationData() {
    if (!selected || savingNegotiation) return;

    if (finalOffer.trim() !== "" && (!Number.isFinite(Number(finalOffer)) || Number(finalOffer) < 0)) {
      setMessage("La oferta final debe ser un número válido y no puede ser negativa.");
      return;
    }

    setSavingNegotiation(true);
    setMessage("");

    const baseUpdates = {
      internal_notes: internalNotes.trim() || null,
      final_offer: finalOffer.trim() === "" ? null : Number(finalOffer),
      updated_at: new Date().toISOString(),
    };
    const followupUpdates = {
      next_followup_date: isClosedOpportunity(selected.status)
        ? null
        : nextFollowupDate || null,
      next_followup_note: !isClosedOpportunity(selected.status) && nextFollowupDate
        ? nextFollowupNote.trim() || null
        : null,
    };

    const result = await supabase
      .from("opportunities")
      .update({ ...baseUpdates, ...followupUpdates })
      .eq("id", selected.id);
    let error = result.error;
    let followupScheduleSaved = true;

    if (error && isMissingFollowupSchemaError(error)) {
      followupScheduleSaved = false;
      const fallbackResult = await supabase
        .from("opportunities")
        .update(baseUpdates)
        .eq("id", selected.id);
      error = fallbackResult.error;
    }

    if (error) {
      setMessage(
        getOpportunityWriteErrorMessage(
          "No se pudieron guardar los datos de negociación",
          error
        )
      );
      setSavingNegotiation(false);
      return;
    }

    if (followupScheduleSaved) {
      setOpportunities((current) =>
        current.map((item) =>
          item.id === selected.id
            ? { ...item, ...baseUpdates, ...followupUpdates }
            : item
        )
      );
    }
    if (followupScheduleSaved && isClosedOpportunity(selected.status)) {
      setNextFollowupDate("");
      setNextFollowupNote("");
    }

    const { data: userData } = await supabase.auth.getUser();
    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_user_id: userData.user?.id ?? null,
      action: "opportunity_negotiation_updated",
      entity_type: "opportunity",
      entity_id: selected.id,
      changes: {
        final_offer: {
          from: selected.final_offer ?? null,
          to: baseUpdates.final_offer,
        },
        internal_notes_updated: internalNotes.trim() !== (selected.internal_notes ?? ""),
        ...(followupScheduleSaved
          ? {
              next_followup_date: {
                from: selected.next_followup_date ?? null,
                to: followupUpdates.next_followup_date,
              },
              next_followup_note_updated:
                followupUpdates.next_followup_note !==
                (selected.next_followup_note ?? null),
            }
          : { followup_schedule_saved: false }),
      },
    });

    if (auditError) {
      console.warn("No se pudo guardar el registro de actividad:", auditError.message);
    }

    const negotiationMessage = !followupScheduleSaved
      ? "Oferta y notas guardadas. No se pudo actualizar el seguimiento porque faltan las migraciones 202611070003 a 202611070006."
      : isClosedOpportunity(selected.status)
        ? "Datos de negociación guardados. No se programó seguimiento porque la oportunidad está cerrada."
        : "Datos de negociación guardados correctamente.";
    setMessage(
      auditError
        ? `${negotiationMessage} No se pudo guardar el registro de actividad.`
        : negotiationMessage
    );
    setSavingNegotiation(false);
  }

  const todayDateKey = getLocalDateKey();
  const overdueFollowupCount = opportunities.filter(
    (item) => !isClosedOpportunity(item.status) && Boolean(item.next_followup_date && item.next_followup_date < todayDateKey)
  ).length;
  const todayFollowupCount = opportunities.filter(
    (item) => !isClosedOpportunity(item.status) && item.next_followup_date === todayDateKey
  ).length;
  const unavailablePhotoCount = Object.keys(photoLabels).filter(
    (key) => !photoUrls[key]
  ).length;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950"><Cargando frase="Cargando oportunidades…" /></main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <Logo alto={20} />
            <h1 className="mt-2 text-2xl font-semibold">
              Panel de administración
            </h1>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">{userEmail}</span>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </header>

        {!isAdmin ? (
          <section className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-7">
            <h2 className="text-xl font-semibold">Iniciar sesión</h2>
            <form onSubmit={handleLogin} className="mt-7 space-y-5">
              <label className="block text-sm">
                Correo electrónico
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3"
                />
              </label>
              <label className="block text-sm">
                Contraseña
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3"
                />
              </label>
              {message && <p className="text-sm text-red-400">{message}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-sky-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"
              >
                {busy ? "Verificando..." : "Ingresar al panel"}
              </button>
            </form>
          </section>
        ) : (
          <>
            {followupSchemaAvailable === false && (
              <section
                role="alert"
                className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100"
              >
                <p className="font-semibold">Falta actualizar el esquema de seguimiento en Supabase.</p>
                <p className="mt-1 leading-6">
                  Las fechas y motivos del próximo contacto no están disponibles. El resto del panel sigue funcionando. Aplicá en orden las migraciones 202611070003 a 202611070006 y después actualizá el listado.
                </p>
              </section>
            )}
            {followupSchemaCheckFailed && (
              <p
                role="status"
                className="mb-6 rounded-xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-100"
              >
                No se pudo verificar si las fechas de seguimiento están disponibles. Actualizá el listado antes de programar nuevos contactos.
              </p>
            )}
            <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">Solicitudes totales</p>
                <p className="mt-2 text-3xl font-semibold">{opportunities.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">Nuevas</p>
                <p className="mt-2 text-3xl font-semibold">
                  {opportunities.filter((item) => item.status === "new").length}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">En negociación</p>
                <p className="mt-2 text-3xl font-semibold">
                  {opportunities.filter((item) => item.status === "negotiation").length}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">Concretadas</p>
                <p className="mt-2 text-3xl font-semibold">
                  {opportunities.filter((item) => item.status === "completed").length}
                </p>
              </div>
              <Link
                href="/admin/consultas"
                className="rounded-xl border border-sky-400/25 bg-sky-400/[0.06] p-5 transition hover:border-sky-300/50 hover:bg-sky-400/10"
              >
                <p className="text-sm text-slate-300">Consultas nuevas de vehículos</p>
                <p className="mt-2 text-3xl font-semibold text-sky-200">
                  {newVehicleInquiryCount ?? "—"}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {newVehicleInquiryCount === null
                    ? vehicleInquiryCountUnavailableReason ?? "No disponible"
                    : "Abrir bandeja"}
                </p>
              </Link>
              <button
                type="button"
                aria-pressed={filterFollowup === "overdue"}
                disabled={followupSchemaAvailable !== true}
                onClick={() => {
                  setSelectedId(null);
                  setFilterFollowup("overdue");
                }}
                className={`rounded-xl border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${filterFollowup === "overdue" ? "border-red-400/50 bg-red-400/10" : "border-white/10 bg-white/[0.04] hover:border-red-400/40"}`}
              >
                <p className="text-sm text-slate-400">Seguimientos vencidos</p>
                <p className="mt-2 text-3xl font-semibold text-red-300">
                  {followupSchemaAvailable === true ? overdueFollowupCount : "—"}
                </p>
              </button>
              <button
                type="button"
                aria-pressed={filterFollowup === "today"}
                disabled={followupSchemaAvailable !== true}
                onClick={() => {
                  setSelectedId(null);
                  setFilterFollowup("today");
                }}
                className={`rounded-xl border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${filterFollowup === "today" ? "border-amber-400/50 bg-amber-400/10" : "border-white/10 bg-white/[0.04] hover:border-amber-400/40"}`}
              >
                <p className="text-sm text-slate-400">Contactos para hoy</p>
                <p className="mt-2 text-3xl font-semibold text-amber-300">
                  {followupSchemaAvailable === true ? todayFollowupCount : "—"}
                </p>
              </button>
            </section>

            <section className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Oportunidades</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Solicitudes de permuta recibidas por ALEZZA.
                </p>
              </div>
              <button
                onClick={loadOpportunities}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
              >
                Actualizar listado
              </button>
            </section>

            {message && (
              <p className="mb-5 rounded-lg border border-sky-400/20 bg-sky-400/10 p-3 text-sm text-sky-200">
                {message}
              </p>
            )}

            <section className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_240px_240px]">
              <input
                type="search"
                placeholder="Buscar cliente, teléfono, marca o modelo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-400"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white"
              >
                <option value="all">Todos los estados</option>
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <select
                value={filterFollowup}
                onChange={(e) => setFilterFollowup(e.target.value)}
                disabled={followupSchemaAvailable !== true}
                className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white"
                aria-label="Filtrar por próximo seguimiento"
              >
                <option value="all">Todos los seguimientos</option>
                <option value="overdue">Seguimientos vencidos</option>
                <option value="today">Seguimientos para hoy</option>
                <option value="scheduled">Seguimientos próximos</option>
                <option value="none">Sin próximo seguimiento</option>
              </select>
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
              <section className="space-y-3">
                {filteredOpportunities.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-8 text-center text-slate-400">
                    No hay solicitudes que coincidan con la búsqueda.
                  </div>
                ) : (
                  filteredOpportunities.map((item) => {
                    const vehicle = item.trade_vehicle ?? {};
                    const active = item.id === selectedId;
                    const today = getLocalDateKey();
                    const followupIsOverdue = Boolean(
                      !isClosedOpportunity(item.status) &&
                        item.next_followup_date && item.next_followup_date < today
                    );
                    const followupIsToday =
                      !isClosedOpportunity(item.status) && item.next_followup_date === today;

                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`w-full rounded-xl border p-5 text-left transition ${
                          active
                            ? "border-sky-400 bg-sky-400/10"
                            : "border-white/10 bg-white/[0.04] hover:border-white/30"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              {item.customer_name || "Cliente sin nombre"}
                            </p>
                            <p className="mt-1 text-sm text-slate-300">
                              {[vehicle.brand, vehicle.model, vehicle.version]
                                .filter(Boolean)
                                .join(" ")}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {vehicle.year ?? "Año no indicado"} · {vehicle.kilometers ?? "Km no indicados"} km
                            </p>
                            {item.desired_vehicle && (
                              <p className="mt-2 text-xs text-slate-400">
                                Le interesa: {[item.desired_vehicle.brand, item.desired_vehicle.model, item.desired_vehicle.version].filter(Boolean).join(" ")} · {item.desired_vehicle.year}
                              </p>
                            )}
                            {!isClosedOpportunity(item.status) && item.next_followup_date && (
                              <p className={`mt-2 text-xs font-medium ${followupIsOverdue ? "text-red-300" : followupIsToday ? "text-amber-300" : "text-sky-300"}`}>
                                Seguimiento {followupIsOverdue ? "vencido" : followupIsToday ? "hoy" : "programado"}: {formatDateOnly(item.next_followup_date)}
                                {item.next_followup_note ? ` · ${item.next_followup_note}` : ""}
                              </p>
                            )}
                          </div>
                          <span className="rounded-full border border-sky-400/30 px-3 py-1 text-xs text-sky-300">
                            {statuses.find((status) => status.value === item.status)?.label ?? item.status}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                          <span>{item.phone || item.email || "Sin contacto"}</span>
                          <span>{new Date(item.created_at).toLocaleString("es-AR")}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </section>

              <aside className="h-fit rounded-xl border border-white/10 bg-white/[0.04] p-5">
                {!selected ? (
                  <div className="py-10 text-center text-sm text-slate-400">
                    Seleccioná una solicitud para consultar sus detalles.
                  </div>
                ) : (
                  <>
                    <div className="border-b border-white/10 pb-4">
                      <p className="text-xs uppercase tracking-widest text-sky-400">
                        Ficha de oportunidad
                      </p>
                      <h3 className="mt-2 text-xl font-semibold">
                        {selected.customer_name || "Cliente sin nombre"}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {new Date(selected.created_at).toLocaleString("es-AR")}
                      </p>
                    </div>

                    <div className="space-y-3 py-5 text-sm">
                      <p><span className="text-slate-400">Teléfono:</span> {selected.phone || "No informado"}</p>
                      <p><span className="text-slate-400">Correo:</span> {selected.email || "No informado"}</p>
                      {(selected.phone || selected.email) && (
                        <div className="flex flex-wrap gap-2">
                          {selectedWhatsAppUrl && (
                            <a
                              href={selectedWhatsAppUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-500"
                            >
                              Contactar por WhatsApp
                            </a>
                          )}
                          {selected.email && (
                            <a
                              href={getEmailUrl(selected.email)}
                              className="inline-flex rounded-lg border border-sky-400/40 px-4 py-2 font-semibold text-sky-200 hover:bg-sky-400/10"
                            >
                              Contactar por correo
                            </a>
                          )}
                        </div>
                      )}
                      {selected.phone && !selectedWhatsAppUrl && (
                        <p role="status" className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
                          No se pudo formar un enlace de WhatsApp con este teléfono. Verificá el número antes de contactar.
                        </p>
                      )}
                      <p><span className="text-slate-400">Vehículo:</span> {[selected.trade_vehicle.brand, selected.trade_vehicle.model, selected.trade_vehicle.version].filter(Boolean).join(" ") || "Sin datos"}</p>
                      <p><span className="text-slate-400">Vehículo que busca:</span> {selected.desired_vehicle ? [selected.desired_vehicle.brand, selected.desired_vehicle.model, selected.desired_vehicle.version].filter(Boolean).join(" ") + ` · ${selected.desired_vehicle.year}` : "No indicó uno del catálogo"}</p>
                      <p><span className="text-slate-400">Año:</span> {selected.trade_vehicle.year ?? "No informado"}</p>
                      <p><span className="text-slate-400">Kilómetros:</span> {selected.trade_vehicle.kilometers ?? "No informados"}</p>
                      <p><span className="text-slate-400">Combustible:</span> {selected.trade_vehicle.fuel || "No informado"}</p>
                      <p><span className="text-slate-400">Transmisión:</span> {selected.trade_vehicle.transmission || "No informada"}</p>
                      <p><span className="text-slate-400">Estado declarado:</span> {selected.trade_vehicle.condition || "No informado"}</p>
                      <p><span className="text-slate-400">Observaciones:</span> {selected.customer_notes || selected.trade_vehicle.notes || "Sin observaciones"}</p>
                    </div>

                    <div className="border-t border-white/10 pt-5">
                      <h4 className="mb-3 font-semibold">Fotografías del vehículo</h4>
                      {loadingPhotoUrls ? (
                        <p className="mb-3 text-sm text-slate-400">Cargando fotografías...</p>
                      ) : unavailablePhotoCount > 0 ? (
                        <p role="status" className="mb-3 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-200">
                          {unavailablePhotoCount} de {Object.keys(photoLabels).length} fotografías no están disponibles. Confirmá Storage o pedile al cliente las que falten antes de evaluar la unidad.
                        </p>
                      ) : null}
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(photoLabels).map(([key, label]) => (
                          <div key={key}>
                            <p className="mb-1 text-xs text-slate-400">{label}</p>
                            {photoUrls[key] ? (
                              <a href={photoUrls[key]} target="_blank" rel="noreferrer">
                                <img
                                  src={photoUrls[key]}
                                  alt={label}
                                  className="h-32 w-full rounded-lg border border-white/10 object-cover"
                                />
                              </a>
                            ) : (
                              <div className="grid h-32 place-items-center rounded-lg border border-white/10 bg-slate-900 text-xs text-slate-500">
                                No disponible
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 border-t border-white/10 pt-5">
                      <label className="mb-2 block text-sm font-semibold">
                        Estado comercial
                      </label>
                      <select
                        value={selected.status}
                        disabled={savingStatus}
                        onChange={(e) => updateStatus(e.target.value as OpportunityStatus)}
                        className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white disabled:opacity-50"
                      >
                        {statuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-slate-500">
                        {savingStatus ? "Guardando cambio..." : "Los cambios se guardan en Supabase."}
                      </p>
                    </div>

                    <div className="mt-6 border-t border-white/10 pt-5">
                      <h4 className="mb-2 font-semibold">Tasación manual</h4>
                      <p className="mb-4 text-xs leading-5 text-slate-400">
                        Cada guardado crea una versión nueva para conservar el historial. La verificación con publicaciones reales se incorporará después.
                      </p>

                      {loadingAppraisal && (
                        <p className="mb-4 text-sm text-slate-400">Cargando tasación...</p>
                      )}

                      {!selectedAppraisal && selected.estimated_value != null && (
                        <p className="mb-4 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
                          Esta oportunidad conserva un valor histórico puntual de {Number(selected.estimated_value).toLocaleString("es-AR")} ARS. No lo convertimos en un rango; cargá un rango manual si querés reemplazarlo.
                        </p>
                      )}

                      {!selectedAppraisal && appraisalCurrency === "USD" && selected.approved_value != null && (
                        <p className="mb-4 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
                          El valor de toma aprobado histórico está expresado en ARS. Al guardar en USD, reemplazá el importe del campo para evitar mezclar monedas.
                        </p>
                      )}

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm">
                            Moneda de la tasación
                            <select
                              value={appraisalCurrency}
                              onChange={(event) => setAppraisalCurrency(event.target.value === "USD" ? "USD" : "ARS")}
                              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3"
                            >
                              <option value="ARS">Pesos argentinos (ARS)</option>
                              <option value="USD">Dólares estadounidenses (USD)</option>
                            </select>
                            <span className="mt-2 block text-xs text-slate-500">
                              Cambiar la moneda no convierte los importes; revisalos antes de guardar.
                            </span>
                          </label>

                          <p className="mt-4 text-sm">Rango estimado de mercado ({appraisalCurrency})</p>
                          <div className="mt-2 grid gap-3 sm:grid-cols-2">
                            <input
                              aria-label={`Valor mínimo estimado de mercado en ${appraisalCurrency}`}
                              type="number"
                              min="0"
                              step={appraisalCurrency === "ARS" ? 1000 : 100}
                              value={marketValueMin}
                              onChange={(e) => setMarketValueMin(e.target.value)}
                              placeholder="Desde"
                              className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3"
                            />
                            <input
                              aria-label={`Valor máximo estimado de mercado en ${appraisalCurrency}`}
                              type="number"
                              min="0"
                              step={appraisalCurrency === "ARS" ? 1000 : 100}
                              value={marketValueMax}
                              onChange={(e) => setMarketValueMax(e.target.value)}
                              placeholder="Hasta"
                              className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3"
                            />
                          </div>
                        </div>

                        <label className="block text-sm">
                          Valor de toma estimado ({appraisalCurrency})
                          <input
                            type="number"
                            min="0"
                            step={appraisalCurrency === "ARS" ? 1000 : 100}
                            value={estimatedTakeValue}
                            onChange={(e) => setEstimatedTakeValue(e.target.value)}
                            placeholder={appraisalCurrency === "ARS" ? "Ej.: 12.750.000" : "Ej.: 12.500"}
                            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3"
                          />
                        </label>

                        <label className="block text-sm">
                          Valor de toma aprobado ({appraisalCurrency})
                          <input
                            type="number"
                            min="0"
                            step={appraisalCurrency === "ARS" ? 1000 : 100}
                            value={approvedValue}
                            onChange={(e) => setApprovedValue(e.target.value)}
                            placeholder="Se registra como aprobación al guardar"
                            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3"
                          />
                        </label>

                        <label className="block text-sm">
                          Fundamento de la tasación
                          <textarea
                            rows={3}
                            value={valuationNotes}
                            onChange={(e) => setValuationNotes(e.target.value)}
                            placeholder="Estado, versión, kilometraje y criterios considerados..."
                            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={saveAppraisal}
                          disabled={savingAppraisal || loadingAppraisal}
                          className="w-full rounded-lg bg-sky-500 px-4 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
                        >
                          {savingAppraisal
                            ? "Guardando tasación..."
                            : selectedAppraisal
                              ? "Guardar nueva versión"
                              : "Guardar tasación"}
                        </button>
                      </div>

                      <section className="mt-6 border-t border-white/10 pt-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h5 className="font-semibold">
                            Historial de tasaciones ({appraisalHistory.length})
                          </h5>
                          {appraisalHistory.length > 0 && (
                            <button
                              type="button"
                              onClick={refreshAppraisalComparables}
                              disabled={loadingAppraisalComparables}
                              className="text-xs text-sky-300 hover:underline disabled:opacity-50"
                            >
                              {loadingAppraisalComparables
                                ? "Actualizando referencias..."
                                : "Actualizar referencias vinculadas"}
                            </button>
                          )}
                        </div>
                        {appraisalHistory.length > 0 && (
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            Cada referencia queda asociada a una versión concreta. Al guardar una nueva versión, vinculá las referencias que correspondan a esa evaluación.
                          </p>
                        )}
                        {loadingAppraisal ? (
                          <p className="mt-3 text-sm text-slate-400">Cargando historial...</p>
                        ) : appraisalHistory.length === 0 ? (
                          <p className="mt-3 text-sm text-slate-400">
                            Todavía no hay versiones de tasación guardadas.
                          </p>
                        ) : (
                          <ol className="mt-3 space-y-3">
                            {appraisalHistory.map((entry, index) => {
                              const entryComparables = appraisalComparables.filter(
                                (comparable) => comparable.appraisal_id === entry.id
                              );

                              return (
                                <li
                                  key={entry.id}
                                  className="rounded-lg border border-white/10 bg-slate-900/70 p-4"
                                >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-sm font-semibold">
                                    Versión {appraisalHistory.length - index} · {entry.currency}
                                  </p>
                                  <time
                                    dateTime={entry.created_at}
                                    className="text-xs text-slate-500"
                                  >
                                    {formatAppraisalDate(entry.created_at)}
                                  </time>
                                </div>
                                <p className="mt-3 text-xs text-slate-300">
                                  Mercado: {formatAppraisalMoney(entry.market_value_min, entry.currency)}
                                  {entry.market_value_min != null || entry.market_value_max != null
                                    ? ` a ${formatAppraisalMoney(entry.market_value_max, entry.currency)}`
                                    : " sin rango cargado"}
                                </p>
                                <p className="mt-1 text-xs text-slate-300">
                                  Toma estimada: {formatAppraisalMoney(entry.estimated_take_value, entry.currency)}
                                  {" · "}
                                  Toma aprobada: {formatAppraisalMoney(entry.approved_take_value, entry.currency)}
                                </p>
                                {entry.explanation && (
                                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-400">
                                    {entry.explanation}
                                  </p>
                                )}
                                <div className="mt-4 border-t border-white/10 pt-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs font-semibold text-slate-300">
                                      Referencias manuales ({entryComparables.length})
                                    </p>
                                    <a
                                      href={`/admin/referencias?appraisal_id=${encodeURIComponent(entry.id)}`}
                                      className="text-xs text-sky-300 hover:underline"
                                    >
                                      {entryComparables.length === 0 ? "Vincular referencias" : "Agregar referencia"}
                                    </a>
                                  </div>
                                  {entryComparables.length > 0 && (
                                    <div className="mt-3">
                                      <MarketSummary items={entryComparables} />
                                    </div>
                                  )}
                                  {entryComparables.length === 0 ? (
                                    <p className="mt-2 text-xs text-slate-500">
                                      No hay referencias vinculadas a esta versión.
                                    </p>
                                  ) : (
                                    <ul className="mt-2 space-y-2">
                                      {entryComparables.map((comparable) => (
                                        <li
                                          key={comparable.id}
                                          className="rounded-lg border border-white/10 bg-slate-950/60 p-3"
                                        >
                                          <div className="flex flex-wrap items-start justify-between gap-2">
                                            <p className="text-xs font-semibold text-slate-200">
                                              {[comparable.brand, comparable.model, comparable.version]
                                                .filter(Boolean)
                                                .join(" ")}{" "}
                                              {comparable.year ?? ""}
                                            </p>
                                            <span className="text-xs font-semibold text-sky-300">
                                              {formatAppraisalMoney(comparable.published_price, comparable.currency)}
                                            </span>
                                          </div>
                                          <p className="mt-1 text-xs text-slate-400">
                                            {comparable.kilometers != null
                                              ? `${comparable.kilometers.toLocaleString("es-AR")} km`
                                              : "Km no informados"}
                                            {comparable.location ? ` · ${comparable.location}` : ""}
                                            {comparable.listing_status ? ` · ${comparable.listing_status}` : ""}
                                          </p>
                                          <p className="mt-1 text-xs text-slate-500">
                                            Publicada: {formatDateOnly(comparable.published_at)} · Observada: {formatAppraisalDate(comparable.observed_at)}
                                          </p>
                                          {(comparable.source || comparable.listing_url) && (
                                            <p className="mt-1 text-xs text-slate-400">
                                              {comparable.source || "Fuente sin indicar"}
                                              {comparable.listing_url && (
                                                <>
                                                  {" · "}
                                                  <a
                                                    href={comparable.listing_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-sky-300 hover:underline"
                                                  >
                                                    Abrir aviso
                                                  </a>
                                                </>
                                              )}
                                            </p>
                                          )}
                                          {comparable.notes && (
                                            <p className="mt-2 whitespace-pre-wrap text-xs text-slate-400">
                                              {comparable.notes}
                                            </p>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </li>
                              );
                            })}
                          </ol>
                        )}
                      </section>
                    </div>

                    <div className="mt-6 border-t border-white/10 pt-5">
                      <h4 className="mb-4 font-semibold">Negociación y próximo seguimiento</h4>
                      {isClosedOpportunity(selected.status) && (
                        <p className="mb-4 rounded-lg border border-slate-400/20 bg-white/[0.04] p-3 text-xs leading-5 text-slate-300">
                          La oportunidad está cerrada. Para programar otro contacto, reabrila primero.
                        </p>
                      )}
                      <div className="space-y-4">
                        <label className="block text-sm">
                          Oferta final realizada (ARS)
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={finalOffer}
                            onChange={(e) => setFinalOffer(e.target.value)}
                            placeholder="Ej.: 12.500.000"
                            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3"
                          />
                        </label>

                        <label className="block text-sm">
                          Notas internas
                          <textarea
                            rows={3}
                            value={internalNotes}
                            onChange={(e) => setInternalNotes(e.target.value)}
                            placeholder="Llamadas, acuerdos, pendientes y próximos pasos..."
                            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3"
                          />
                        </label>

                        <label className="block text-sm">
                          Próxima fecha de contacto
                          <input
                            type="date"
                            value={nextFollowupDate}
                            disabled={
                              isClosedOpportunity(selected.status) ||
                              followupSchemaAvailable !== true
                            }
                            onChange={(e) => {
                              setNextFollowupDate(e.target.value);
                              if (!e.target.value) setNextFollowupNote("");
                            }}
                            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 disabled:opacity-50"
                          />
                        </label>

                        <label className="block text-sm">
                          Motivo o acción pendiente
                          <input
                            type="text"
                            maxLength={500}
                            value={nextFollowupNote}
                            onChange={(e) => setNextFollowupNote(e.target.value)}
                            disabled={
                              !nextFollowupDate ||
                              isClosedOpportunity(selected.status) ||
                              followupSchemaAvailable !== true
                            }
                            placeholder="Ej.: llamar para confirmar inspección"
                            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 disabled:opacity-50"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={saveNegotiationData}
                          disabled={savingNegotiation}
                          className="w-full rounded-lg border border-white/15 px-4 py-3 font-semibold hover:bg-white/10 disabled:opacity-50"
                        >
                          {savingNegotiation ? "Guardando cambios..." : "Guardar negociación y seguimiento"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-6 border-t border-white/10 pt-5">
                      <h4 className="mb-4 font-semibold">Historial de seguimiento</h4>

                      <div className="space-y-3">
                        <label className="block text-sm">
                          Tipo de actividad
                          <select
                            value={followupType}
                            onChange={(e) => setFollowupType(e.target.value)}
                            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3"
                          >
                            <option value="note">Nota</option>
                            <option value="call">Llamada</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="meeting">Reunión / inspección</option>
                            <option value="offer">Oferta</option>
                            <option value="agreement">Acuerdo</option>
                          </select>
                        </label>

                        <label className="block text-sm">
                          Detalle de la actividad
                          <textarea
                            rows={3}
                            value={followupContent}
                            onChange={(e) => setFollowupContent(e.target.value)}
                            placeholder="Describí el contacto, propuesta o acuerdo..."
                            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={addFollowup}
                          disabled={savingFollowup || !followupContent.trim()}
                          className="w-full rounded-lg bg-sky-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"
                        >
                          {savingFollowup ? "Registrando..." : "Agregar al historial"}
                        </button>
                      </div>

                      <div className="mt-6 space-y-3">
                        {loadingFollowups ? (
                          <p className="text-sm text-slate-400">Cargando historial...</p>
                        ) : followups.length === 0 ? (
                          <p className="text-sm text-slate-500">
                            Todavía no hay actividades registradas.
                          </p>
                        ) : (
                          followups.map((entry) => (
                            <article
                              key={entry.id}
                              className="rounded-lg border border-white/10 bg-slate-900/70 p-4"
                            >
                              <div className="flex flex-wrap justify-between gap-2">
                                <span className="text-sm font-semibold text-sky-300">
                                  {{
                                    note: "Nota",
                                    call: "Llamada",
                                    whatsapp: "WhatsApp",
                                    meeting: "Reunión / inspección",
                                    offer: "Oferta",
                                    agreement: "Acuerdo",
                                  }[entry.type] ?? entry.type}
                                </span>
                                <time className="text-xs text-slate-500">
                                  {new Date(entry.created_at).toLocaleString("es-AR")}
                                </time>
                              </div>
                              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
                                {entry.content}
                              </p>
                            </article>
                          ))
                        )}
                      </div>
                    </div>
                  </>                )}
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
