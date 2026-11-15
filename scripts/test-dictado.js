const fs = require("fs");
const src = fs.readFileSync(require("path").join(__dirname, "../public/os/app.js"), "utf8");
const cut = (a, b) => src.slice(src.indexOf(a), src.indexOf(b, src.indexOf(a)));
const code = cut("  const DIAS", "  const items =") +
  cut("  // ---------- Interpretar una línea", "  function detectarArea") +
  "function detectarArea(){return 'x'}\n" +
  cut("  const NUM =", "  function dictar()") +
  "module.exports={interpretar,normalizarDictado};";
const m = { exports: {} }; new Function("module", code)(m);
const { interpretar, normalizarDictado } = m.exports;
const casos = [
  ["mañana a las cinco y media de la tarde reunión con Juan", "17:30"],
  ["el veinte de noviembre a las diez entrega del auto", "10:00"],
  ["agenda a la una de la tarde gestor", "13:00"],
  ["turno a las nueve de la mañana", "09:00"],
  ["mañana a las nueve de la mañana lavar el auto", "09:00"],
  ["llamar a Pedro el lunes a las 8 de la noche", "20:00"],
];
for (const [t, hora] of casos) {
  const n = normalizarDictado(t), r = interpretar(n);
  console.log(r.hora === hora ? "OK " : "MAL", JSON.stringify(n), "→", r.tipo, r.fecha, r.hora, "|", r.titulo);
  if (r.hora !== hora) process.exitCode = 1;
}
