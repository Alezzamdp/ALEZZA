// El ecosistema ALEZZA: cada área, qué problema resuelve y a dónde lleva.
// Lo usan el Inicio (guía "¿Qué necesitás resolver?" y las fichas) y el menú.
import { contacto } from "@/lib/contacto";

export type Area = {
  k: string;
  nombre: string;
  problema: string; // lo que dice la persona: sirve para elegir
  resuelve: string; // qué hacemos
  incluye: string[];
  href: string;
  accion: string;
};

export const AREAS: Area[] = [
  { k: "asesoria", nombre: "Asesoría automotor",
    problema: "No sé por dónde empezar ni qué me conviene.",
    resuelve: "Te ordenamos la decisión: qué comprar, cuándo vender y cómo hacerlo sin perder plata.",
    incluye: ["Qué auto te conviene según uso y presupuesto", "Revisión de una unidad antes de comprarla", "Precio real de mercado, con referencias"],
    href: contacto("asesoria"), accion: "Pedir asesoramiento" },
  { k: "compra", nombre: "Compra y venta",
    problema: "Busco un usado confiable o quiero vender el mío.",
    resuelve: "Unidades revisadas y publicadas por nosotros, y venta de la tuya con la preparación y el precio correctos.",
    incluye: ["Catálogo de unidades disponibles", "Consulta por cada unidad, sin compromiso", "Tu auto publicado y listo para mostrar"],
    href: "/vehiculos", accion: "Ver el catálogo" },
  { k: "permuta", nombre: "Permutas y tasación",
    problema: "Quiero cambiar mi auto o saber cuánto vale.",
    resuelve: "Nos pasás los datos de tu auto y te decimos cuánto lo tomamos y a qué unidades llegás entregándolo.",
    incluye: ["Tasación con referencias de mercado", "Tu auto como parte de pago", "Diferencia en efectivo o financiada"],
    // El portal /simulador está fuera del sitio (redirect en next.config.ts): mientras tanto se coordina por Contacto.
    href: contacto("permuta"), accion: "Consultar una permuta" },
  { k: "financiacion", nombre: "Financiación",
    problema: "No llego con el efectivo.",
    resuelve: "Cuotas fijas en pesos solo con tu DNI. Simulás la cuota y nosotros hacemos la gestión.",
    incluye: ["Simulador de cuota al instante", "Solo DNI, mínimos requisitos", "Se combina con la permuta"],
    href: "/financiacion", accion: "Simular mi cuota" },
  { k: "estetica", nombre: "Estética vehicular",
    problema: "Mi auto está opaco o sucio, o lo quiero dejar listo para vender.",
    resuelve: "Taller de detail propio: lavado técnico, interiores, motor y pulido. Con turno online y seguimiento en vivo.",
    incluye: ["Planes con precio a la vista", "Turno online con seña", "Seguís el trabajo desde un enlace"],
    href: "/servicios", accion: "Ver servicios y precios" },
  { k: "gestoria", nombre: "Gestoría",
    problema: "Tengo que hacer la transferencia o algún papel del auto.",
    resuelve: "Nos ocupamos del trámite para que compres o vendas con los papeles en regla.",
    incluye: ["Transferencias", "Informes de dominio y de deuda", "Te decimos qué documentación llevar"],
    href: contacto("gestoria"), accion: "Consultar un trámite" },
  { k: "talleres", nombre: "Talleres de confianza",
    problema: "Necesito un mecánico, chapista o electricista que no me falle.",
    resuelve: "Te derivamos a talleres con los que trabajamos, según lo que necesite tu auto.",
    incluye: ["Mecánica y service", "Chapa y pintura", "Electricidad y diagnóstico"],
    href: contacto("talleres"), accion: "Pedir una recomendación" },
];
