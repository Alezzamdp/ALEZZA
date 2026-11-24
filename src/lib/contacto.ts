// Contacto de ALEZZA. Sin dependencias de servidor: lo usan páginas de servidor y de cliente.
// El sitio tiene un único apartado de contacto (/contacto, con WhatsApp e Instagram): el resto de las páginas
// enlaza ahí con contacto("tema"), que deja armado el mensaje según de dónde viene la persona.
import { mensajeAlezza, waAlezza } from "@/lib/turnos";

export const SITIO = "https://alezza.com.ar";
export const UBICACION = "Mar del Plata, Argentina";
export const INSTAGRAM = "https://instagram.com/alezzamdp";
// Grupo de WhatsApp de compraventa entre colegas (ingreso con aprobación manual de los admins).
export const GRUPO_COLEGAS = "https://chat.whatsapp.com/DSUp82uDzCmGEh1G3wSFxM";
export const externo = { target: "_blank", rel: "noopener noreferrer" } as const;

// Tema de la consulta: título que se muestra en /contacto, pedido y datos que conviene completar en el mensaje.
export const TEMAS = {
  consulta: { t: "Consulta general", pedido: "Quiero hacer una consulta.", datos: ["Vehículo"] },
  asesoria: { t: "Asesoría automotor", pedido: "Necesito asesoramiento sobre un vehículo.", datos: ["Qué necesito", "Vehículo"] },
  compra: { t: "Compra y venta", pedido: "Quiero comprar o vender un vehículo.", datos: ["Qué busco", "Vehículo"] },
  permuta: { t: "Permutas y tasación", pedido: "Quiero avanzar con una permuta.", datos: ["Mi auto"] },
  financiacion: { t: "Financiación", pedido: "Quiero consultar por una financiación.", datos: ["Vehículo", "Monto a financiar"] },
  estetica: { t: "Estética vehicular", pedido: "Quiero consultar por un servicio de estética.", datos: ["Vehículo", "Qué le quiero hacer"] },
  turno: { t: "Mi turno o mi auto en el taller", pedido: "Tengo una consulta sobre mi turno.", datos: [] },
  agencia: { t: "Alianza para agencias", pedido: "Soy de una agencia y quiero coordinar una alianza para preparar nuestras unidades.", datos: ["Agencia", "Unidades por mes", "Qué necesitan las unidades"] },
  gestoria: { t: "Gestoría", pedido: "Necesito hacer un trámite del automotor.", datos: ["Trámite", "Vehículo"] },
  talleres: { t: "Talleres de confianza", pedido: "Necesito que me recomienden un taller.", datos: ["Qué le pasa al auto", "Vehículo"] },
} as const;
export type Tema = keyof typeof TEMAS;

export const esTema = (x: unknown): x is Tema => typeof x === "string" && Object.hasOwn(TEMAS, x);

// Enlace al apartado de contacto. `ref` es una referencia corta que viaja en el mensaje (orden, patente, unidad).
export function contacto(tema: Tema = "consulta", ref?: string | null) {
  const q = new URLSearchParams();
  if (tema !== "consulta") q.set("tema", tema);
  if (ref) q.set("ref", ref.slice(0, 140));
  const s = q.toString();
  return "/contacto" + (s ? "?" + s : "");
}

// WhatsApp con el pedido del tema y los datos que cargó la persona (nombre, auto…); los renglones vacíos no se mandan.
export function waMensaje(tema: Tema, filas: [string, string | null][], ref?: string) {
  return waAlezza(mensajeAlezza(TEMAS[tema].pedido, [...(ref ? ([["Referencia", ref]] as [string, string][]) : []), ...filas]));
}

// Mensaje estructurado de WhatsApp para un tema, con marcas "(completar)" (ya no se usa: /contacto pide los datos antes).
export function waTema(tema: Tema, ref?: string) {
  const { pedido, datos } = TEMAS[tema];
  return waAlezza(mensajeAlezza(pedido, [
    ...(ref ? [["Referencia", ref] as [string, string]] : []),
    ...datos.map((d) => [d, "(completar)"] as [string, string]),
  ]));
}
