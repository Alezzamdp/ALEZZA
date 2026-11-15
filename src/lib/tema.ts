// Modo claro/oscuro: <html data-tema>. Sin elección guardada, sigue al sistema.
export const SCRIPT_TEMA = `try{var t=localStorage.getItem('tema');document.documentElement.dataset.tema=t==='oscuro'||(t!=='claro'&&matchMedia('(prefers-color-scheme: dark)').matches)?'oscuro':'claro'}catch(e){}`;

export function cambiarTema() {
  const t = document.documentElement.dataset.tema === "oscuro" ? "claro" : "oscuro";
  document.documentElement.dataset.tema = t;
  try { localStorage.setItem("tema", t); } catch {}
  return t;
}
