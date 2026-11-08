"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Vehicle = {
  id: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  kilometers: number | null;
  fuel: string | null;
  transmission: string | null;
  price_ars: number | null;
  price_usd: number | null;
  currency: string | null;
  status: string;
  description: string | null;
  image_urls: string[] | null;
};

function formatPrice(vehicle: Vehicle) {
  if (vehicle.currency === "USD" && vehicle.price_usd != null) {
    return `USD ${Number(vehicle.price_usd).toLocaleString("es-AR")}`;
  }
  if (vehicle.price_ars != null) {
    return `$ ${Number(vehicle.price_ars).toLocaleString("es-AR")}`;
  }
  if (vehicle.price_usd != null) {
    return `USD ${Number(vehicle.price_usd).toLocaleString("es-AR")}`;
  }
  return "Precio a consultar";
}

export default function VehicleCard({
  vehicle,
  contactHref,
  contactTarget,
  contactLabel,
}: {
  vehicle: Vehicle;
  contactHref?: string | null;
  contactTarget?: "_blank";
  contactLabel?: string;
}) {
  const photos = vehicle.image_urls ?? [];
  const [photoIndex, setPhotoIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const previousPhoto = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    setPhotoIndex((current) =>
      current === 0 ? photos.length - 1 : current - 1
    );
  };

  const nextPhoto = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    setPhotoIndex((current) =>
      current === photos.length - 1 ? 0 : current + 1
    );
  };

  useEffect(() => {
    if (!modalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModalOpen(false);
      if (event.key === "ArrowLeft") previousPhoto();
      if (event.key === "ArrowRight") nextPhoto();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalOpen, photos.length]);

  const statusLabel =
    vehicle.status === "reserved" ? "Reservado" : "Disponible";

  return (
    <>
      <article className="overflow-hidden rounded-xl border border-gray-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-lg">
        <div className="group relative aspect-[4/3] bg-[#E9EFF5]">
          {photos.length > 0 ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="h-full w-full cursor-zoom-in"
              aria-label={`Ampliar fotos de ${vehicle.brand} ${vehicle.model}`}
            >
              <img
                src={photos[photoIndex]}
                alt={`${vehicle.brand} ${vehicle.model} - Foto ${photoIndex + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex h-full w-full items-center justify-center text-center"
            >
              <div>
                <p className="text-xs font-semibold tracking-widest text-[#347EAF]">
                  {vehicle.brand}
                </p>
                <p className="mt-2 text-2xl font-bold text-[#173B68]">
                  {vehicle.model}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Ver publicación
                </p>
              </div>
            </button>
          )}

          <span
            className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold ${
              vehicle.status === "reserved"
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {statusLabel}
          </span>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={previousPhoto}
                aria-label="Fotografía anterior"
                className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/50 bg-black/55 text-2xl text-white shadow-lg transition hover:bg-black/80"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={nextPhoto}
                aria-label="Fotografía siguiente"
                className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/50 bg-black/55 text-2xl text-white shadow-lg transition hover:bg-black/80"
              >
                ›
              </button>

              <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
                {photoIndex + 1} / {photos.length}
              </span>
            </>
          )}

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="absolute bottom-3 left-3 rounded-full bg-black/65 px-3 py-2 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100"
          >
            Ver publicación
          </button>
        </div>

        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#347EAF]">
            {vehicle.year}
            {vehicle.kilometers != null &&
              ` · ${Number(vehicle.kilometers).toLocaleString("es-AR")} km`}
          </p>

          <h3 className="mt-2 text-xl font-bold text-[#173B68]">
            {vehicle.brand} {vehicle.model}
          </h3>

          {vehicle.version && (
            <p className="mt-1 text-sm text-gray-500">{vehicle.version}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
            {vehicle.fuel && (
              <span className="rounded-full bg-gray-100 px-3 py-1">
                {vehicle.fuel}
              </span>
            )}
            {vehicle.transmission && (
              <span className="rounded-full bg-gray-100 px-3 py-1">
                {vehicle.transmission}
              </span>
            )}
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <p className="text-xs text-gray-500">Precio</p>
            <p className="mt-1 text-xl font-bold text-[#173B68]">
              {formatPrice(vehicle)}
            </p>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-5 w-full rounded-lg border border-[#173B68] px-5 py-3 text-sm font-semibold text-[#173B68] transition hover:bg-[#F0F5FA]"
            >
              Ver publicación
            </button>
          </div>
        </div>
      </article>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${vehicle.brand} ${vehicle.model}`}
            className="relative my-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              aria-label="Cerrar publicación"
              className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/70 text-2xl text-white hover:bg-black"
            >
              ×
            </button>

            <div className="grid md:grid-cols-[1.15fr_0.85fr]">
              <div className="relative flex min-h-[260px] items-center justify-center bg-[#E9EFF5] md:min-h-[540px]">
                {photos.length > 0 ? (
                  <img
                    src={photos[photoIndex]}
                    alt={`${vehicle.brand} ${vehicle.model} - Foto ${photoIndex + 1}`}
                    className="max-h-[75vh] w-full object-contain"
                  />
                ) : (
                  <p className="text-gray-500">Sin fotografías disponibles</p>
                )}

                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => previousPhoto()}
                      aria-label="Fotografía anterior"
                      className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-3xl text-white hover:bg-black"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => nextPhoto()}
                      aria-label="Fotografía siguiente"
                      className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-3xl text-white hover:bg-black"
                    >
                      ›
                    </button>
                    <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-xs text-white">
                      {photoIndex + 1} de {photos.length} fotografías
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-col p-6 sm:p-8">
                <p className="text-xs font-bold tracking-[0.2em] text-[#347EAF]">
                  CATÁLOGO ALEZZA
                </p>

                <h2 className="mt-3 text-2xl font-bold text-[#173B68] sm:text-3xl">
                  {vehicle.brand} {vehicle.model}
                </h2>

                {vehicle.version && (
                  <p className="mt-2 text-gray-500">{vehicle.version}</p>
                )}

                <p className="mt-5 text-3xl font-bold text-[#173B68]">
                  {formatPrice(vehicle)}
                </p>

                <span
                  className={`mt-4 w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                    vehicle.status === "reserved"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {statusLabel}
                </span>

                <div className="mt-7 grid grid-cols-2 gap-4 border-y border-gray-100 py-5">
                  <div>
                    <p className="text-xs text-gray-500">Año</p>
                    <p className="mt-1 font-semibold">{vehicle.year}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Kilómetros</p>
                    <p className="mt-1 font-semibold">
                      {vehicle.kilometers != null
                        ? `${Number(vehicle.kilometers).toLocaleString("es-AR")} km`
                        : "A consultar"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Combustible</p>
                    <p className="mt-1 font-semibold">
                      {vehicle.fuel || "A consultar"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Transmisión</p>
                    <p className="mt-1 font-semibold">
                      {vehicle.transmission || "A consultar"}
                    </p>
                  </div>
                </div>

                {vehicle.description && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-800">
                      Información del vehículo
                    </h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-gray-600">
                      {vehicle.description}
                    </p>
                  </div>
                )}

                <div className="mt-auto pt-8">
                  <Link
                    href={`/consultar?vehicle_id=${encodeURIComponent(vehicle.id)}`}
                    className="block rounded-lg bg-[#173B68] px-5 py-4 text-center font-semibold text-white transition hover:bg-[#24558B]"
                  >
                    Consultar por esta unidad
                  </Link>
                  {contactHref && (
                    <a
                      href={contactHref}
                      target={contactTarget}
                      rel={contactTarget ? "noreferrer" : undefined}
                      className="mt-3 block rounded-lg border border-[#173B68] px-5 py-3 text-center text-sm font-semibold text-[#173B68] transition hover:bg-[#F0F5FA]"
                    >
                      {contactLabel ?? "Contactar a ALEZZA"}
                    </a>
                  )}
                  <a
                    href={`/simulador?desired_vehicle_id=${encodeURIComponent(vehicle.id)}`}
                    className="mt-3 block rounded-lg border border-gray-200 px-5 py-3 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Simular permuta
                  </a>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="mt-3 w-full rounded-lg border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Volver al catálogo
                  </button>
                </div>
              </div>
            </div>

            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-t border-gray-100 p-3">
                {photos.map((photo, index) => (
                  <button
                    key={`${vehicle.id}-thumb-${index}`}
                    type="button"
                    onClick={() => setPhotoIndex(index)}
                    aria-label={`Ver fotografía ${index + 1}`}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${
                      photoIndex === index
                        ? "border-[#173B68]"
                        : "border-transparent opacity-60"
                    }`}
                  >
                    <img
                      src={photo}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
