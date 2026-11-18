// SEO del sitio público: textos para buscadores y compartir, datos estructurados del negocio (schema.org) y preguntas frecuentes.
// Todo sale de lo que ya está publicado (precios de la configuración, servicios, ubicación): nada inventado.
import { INSTAGRAM, SITIO } from "@/lib/contacto";
import { DETALLE_EXTRAS, PLANES, TALLER, pesos, precioPlan, type Extra, type TurnosConfig } from "@/lib/turnos";

export const SEO_TITULO = "ALEZZA DETAIL · Detail y estética vehicular en Mar del Plata";
export const SEO_DESCRIPCION =
  "Taller de detail en Mar del Plata: lavado, pulido, interiores y motor. Preparamos autos para vender y trabajamos con agencias. Pedí tu turno por WhatsApp.";
export const SEO_IMAGEN = "/og.jpg"; // 1200x630, se arma desde una foto del taller

const precioNum = (c: TurnosConfig, k: keyof TurnosConfig["precios"]) => (Number(c.precios[k]) > 0 ? Number(c.precios[k]) : null);

// Negocio local (AutoWash es el tipo de schema.org más cercano al detail y coincide con la ficha de Google Maps).
export function jsonLdNegocio(config: TurnosConfig) {
  const oferta = (nombre: string, precio: number | null, descripcion: string) => ({
    "@type": "Offer",
    ...(precio ? { price: String(precio), priceCurrency: "ARS" } : {}),
    itemOffered: { "@type": "Service", name: nombre, description: descripcion },
  });
  const extras = (Object.keys(DETALLE_EXTRAS) as Extra[]).map((k) => oferta(DETALLE_EXTRAS[k][0], precioNum(config, k), DETALLE_EXTRAS[k][1]));
  return {
    "@context": "https://schema.org",
    "@type": "AutoWash",
    "@id": `${SITIO}/#negocio`,
    name: "ALEZZA DETAIL",
    alternateName: "ALEZZA",
    url: SITIO,
    image: [SITIO + SEO_IMAGEN],
    logo: `${SITIO}/logo-alezza.png`,
    description: SEO_DESCRIPCION,
    telephone: "+54 223 421-2621",
    address: { "@type": "PostalAddress", addressLocality: "Mar del Plata", addressRegion: "Provincia de Buenos Aires", postalCode: "B7600", addressCountry: "AR" },
    geo: { "@type": "GeoCoordinates", latitude: TALLER.lat, longitude: TALLER.lng },
    hasMap: TALLER.maps,
    areaServed: { "@type": "City", name: "Mar del Plata" },
    sameAs: [INSTAGRAM],
    founder: { "@type": "Person", name: "Bruno" },
    makesOffer: [
      oferta("Preparación base", precioNum(config, "lavado"), PLANES[0].items.join(". ") + "."),
      oferta("Plan Agencias · Preparación integral", precioNum(config, "puesta"), PLANES[1].items.join(". ") + "."),
      ...extras,
    ],
  };
}

// Preguntas frecuentes (se muestran en la página y se publican como FAQPage para buscadores).
export function preguntas(config: TurnosConfig): { p: string; r: string }[] {
  const sueltos = (Object.keys(DETALLE_EXTRAS) as Extra[]).map((k) => precioNum(config, k)).filter((x): x is number => x !== null);
  const rango = sueltos.length ? ` Los servicios sueltos van de ${pesos(Math.min(...sueltos))} a ${pesos(Math.max(...sueltos))}.` : "";
  return [
    {
      p: "¿Qué es el detail (detailing) de un auto?",
      r: "Es una limpieza y puesta a punto profunda del vehículo, mucho más completa que un lavado común: se trabaja la pintura (pulido y brillo), el interior, las butacas y el motor para que el auto se vea cuidado y conserve su valor.",
    },
    {
      p: "¿Qué incluye la Preparación integral del Plan Agencias?",
      r: `${PLANES[1].items.join(", ")}, con turnos por lote y prioridad en el taller. Es la opción pensada para agencias que necesitan preparar su stock.`,
    },
    {
      p: "¿Cuánto cuesta un servicio de detail en ALEZZA?",
      r: `La Preparación base cuesta ${precioPlan(config, "lavado")} y la Preparación integral (Plan Agencias) ${precioPlan(config, "puesta")} por unidad.${rango}`,
    },
    {
      p: "¿Dónde está el taller y cómo pido turno?",
      r: "El taller ALEZZA DETAIL está en Mar del Plata. Pedís el turno desde la web, completás los datos del auto y te llevamos a WhatsApp para coordinar el día y la hora.",
    },
  ];
}

export function jsonLdPreguntas(items: { p: string; r: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((x) => ({ "@type": "Question", name: x.p, acceptedAnswer: { "@type": "Answer", text: x.r } })),
  };
}

// JSON para un <script type="application/ld+json">: se escapa "<" para que nada cierre la etiqueta.
export const jsonSeguro = (x: unknown) => JSON.stringify(x).replace(/</g, "\\u003c");
