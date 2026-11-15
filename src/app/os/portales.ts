// Todas las páginas y apps de ALEZZA. BRUNO OS es la puerta de entrada a cada una.
// Portal nuevo = una línea acá (se ve en el login, en Inicio y en Apps).
export type Portal = { n: string; grupo: "Público" | "Gestión" | "Sistema"; t: string; d: string; u: string };

export const PORTALES: Portal[] = [
  { n: "01", grupo: "Público", t: "Inicio", d: "La página de ALEZZA", u: "/" },
  { n: "02", grupo: "Público", t: "Catálogo", d: "Unidades publicadas", u: "/vehiculos" },
  { n: "03", grupo: "Público", t: "Permutas", d: "Tasación y asesor de compra", u: "/simulador" },
  { n: "04", grupo: "Público", t: "Financiación", d: "Cuotas con DNI (CreditCar)", u: "/financiacion" },
  { n: "05", grupo: "Público", t: "Servicios", d: "Estética técnica automotriz", u: "/servicios" },
  { n: "06", grupo: "Público", t: "Pedir turno", d: "Reserva con seña online", u: "/turnos" },
  { n: "07", grupo: "Gestión", t: "Turnos", d: "Reservas, pagos y avisos", u: "/admin/turnos" },
  { n: "08", grupo: "Gestión", t: "Taller", d: "Órdenes, fotos y avisos al cliente", u: "/admin/taller" },
  { n: "09", grupo: "Gestión", t: "Oportunidades", d: "Permutas y tasaciones en curso", u: "/admin" },
  { n: "10", grupo: "Gestión", t: "Créditos", d: "Solicitudes de financiación", u: "/admin/financiacion" },
  { n: "11", grupo: "Gestión", t: "Vehículos", d: "Alta y edición del catálogo", u: "/admin/vehiculos" },
  { n: "12", grupo: "Gestión", t: "Consultas", d: "Mensajes de compradores", u: "/admin/consultas" },
  { n: "13", grupo: "Gestión", t: "Referencias", d: "Comparables y Mercado Libre", u: "/admin/referencias" },
  { n: "14", grupo: "Gestión", t: "Mercado hoy", d: "Dólar del día y tu stock contra el mercado", u: "/admin/mercado" },
  { n: "15", grupo: "Gestión", t: "Bot Marketplace", d: "Lo que sabe, cómo escribe y su actividad", u: "/admin/bot" },
  { n: "16", grupo: "Sistema", t: "Configuración", d: "Perfil, turnos y Mercado Libre", u: "/admin/configuracion" },
  { n: "17", grupo: "Sistema", t: "Actividad", d: "Registro de cambios", u: "/admin/actividad" },
];
