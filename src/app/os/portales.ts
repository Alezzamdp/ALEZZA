// Las páginas de ALEZZA. BRUNO OS es la puerta de entrada a cada una.
// Portal nuevo = una línea acá (se ve en el login, en Inicio y en Apps).
// "sub": páginas que viven dentro de ese portal (aparecen como pestañas en la barra).
export type Portal = { n: string; grupo: "Público" | "Gestión" | "Sistema"; t: string; d: string; u: string; sub?: { t: string; u: string }[] };

export const PORTALES: Portal[] = [
  { n: "01", grupo: "Público", t: "Inicio", d: "La página de ALEZZA", u: "/" },
  { n: "02", grupo: "Público", t: "Catálogo", d: "Unidades, permutas y financiación", u: "/vehiculos",
    sub: [{ t: "Permutas", u: "/simulador" }, { t: "Financiación", u: "/financiacion" }] },
  { n: "03", grupo: "Público", t: "Servicios", d: "Estética y pedido de turno", u: "/servicios",
    sub: [{ t: "Pedir turno", u: "/turnos" }] },
  { n: "04", grupo: "Gestión", t: "Taller", d: "Turnos, órdenes y avisos", u: "/admin/taller",
    sub: [{ t: "Turnos", u: "/admin/turnos" }] },
  { n: "05", grupo: "Gestión", t: "Stock", d: "Vehículos, créditos y consultas", u: "/admin/vehiculos",
    sub: [{ t: "Créditos", u: "/admin/financiacion" }, { t: "Consultas", u: "/admin/consultas" }] },
  { n: "06", grupo: "Gestión", t: "Bot Marketplace", d: "Clientes, actividad y lo que sabe", u: "/admin/bot" },
  { n: "07", grupo: "Sistema", t: "Configuración", d: "Perfil, turnos y Mercado Libre", u: "/admin/configuracion" },
  { n: "08", grupo: "Sistema", t: "Actividad", d: "Registro de cambios", u: "/admin/actividad" },
];
