/* BRUNO OS · v12
   Un solo lugar para anotar: la app entiende qué es (agenda, tarea, idea, nota) y lo guarda.
   Vive en /os del proyecto ALEZZA; los datos van a Supabase (ver src/app/os/BrunoOS.tsx). */
(function () {
  'use strict';

  // ---------- Constantes ----------
  const CLAVE = 'brunoos.v4';
  const AREAS = ['Personal', 'ALEZZA', 'Autos', 'Sistemas', 'Cuerpo', 'Música'];
  const TIPOS = { evento: 'Agenda', tarea: 'Tarea', idea: 'Idea', nota: 'Nota' };
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  // ---------- Utilidades ----------
  const $ = (sel, el) => (el || document).querySelector(sel);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const hoy = () => iso(new Date());
  const deIso = (s) => new Date(s + 'T12:00:00');
  const addDias = (s, n) => { const d = deIso(s); d.setDate(d.getDate() + n); return iso(d); };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sinAcentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const fechaCorta = (s) => { if (!s) return ''; const d = deIso(s); return d.getDate() + ' ' + MESES_CORTO[d.getMonth()]; };
  const relativo = (s) => { if (!s) return ''; const h = hoy(); if (s === h) return 'hoy'; if (s === addDias(h, 1)) return 'mañana'; if (s === addDias(h, -1)) return 'ayer'; return fechaCorta(s); };
  const diaLargo = (s) => { const d = deIso(s); return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()]; };

  // ---------- Datos ----------
  // La verdad está en Supabase (tabla bruno_items). En el navegador queda una copia para abrir al instante
  // y una cola de cambios sin subir, para que nada se pierda si se corta la conexión.
  let datos = { version: 4, items: [] };
  // Los movimientos de plata de versiones anteriores quedan guardados (y en la copia) pero no se muestran.
  const items = () => datos.items.filter((x) => TIPOS[x.tipo]);
  function agregar(item) {
    const it = Object.assign({ id: uid(), creado: new Date().toISOString(), estado: 'pendiente' }, item);
    datos.items.unshift(it);
    guardar(it.id);
    return it;
  }
  function actualizar(id, cambios) {
    const it = datos.items.find((x) => x.id === id);
    if (!it) return;
    Object.assign(it, cambios);
    guardar(id);
  }
  function borrar(id) {
    const i = datos.items.findIndex((x) => x.id === id);
    if (i < 0) return null;
    const [it] = datos.items.splice(i, 1);
    guardar(id);
    return { item: it, indice: i };
  }
  function restaurar(guardado) {
    datos.items.splice(guardado.indice, 0, guardado.item);
    guardar(guardado.item.id);
  }

  // ---------- Interpretar una línea ----------
  function interpretar(texto) {
    const raw = texto.trim().replace(/\s+/g, ' ');
    const low = sinAcentos(raw.toLowerCase());
    const h = hoy();
    let titulo = raw;

    let m;
    if ((m = raw.match(/^(idea|se me ocurrio|se me ocurrió|podria|podría)[:\s]+/i))) {
      return { tipo: 'idea', titulo: cap(raw.slice(m[0].length).trim()), area: detectarArea(low) };
    }
    if ((m = raw.match(/^(nota|recordar|dato|anotar|acordarme)[:\s]+/i))) {
      return { tipo: 'nota', titulo: cap(raw.slice(m[0].length).trim()), area: detectarArea(low) };
    }

    let restoTitulo = raw;
    const quitar = (re) => { restoTitulo = restoTitulo.replace(re, ' '); };

    // La palabra manda: "agenda" en cualquier lado lo lleva a la agenda; "tarea" o "pendiente", a tareas.
    let forzado = null;
    if (/\b(agenda|agendar|agendame|agendalo|agendala)\b/.test(low)) { forzado = 'evento'; quitar(/\b(agenda|agendar|agendame|agendalo|agendala|agendá)\b:?/i); }
    else if (/\b(tarea|pendiente)\b/.test(low)) { forzado = 'tarea'; quitar(/\b(tarea|pendiente)\b:?/i); }

    // Fecha
    let fecha = null;
    if (/\bpasado manana\b/.test(low)) { fecha = addDias(h, 2); quitar(/pasado mañana/i); }
    else if (/(?<!de la )\bmanana\b/.test(low)) { fecha = addDias(h, 1); quitar(/(?<!de la )\bma[ñn]ana\b/i); } // "de la mañana" es la hora, no el día
    else if (/\bhoy\b/.test(low)) { fecha = h; quitar(/\bhoy\b/i); }
    if (!fecha && (m = low.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/))) {
      const d = new Date(m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : deIso(h).getFullYear(), +m[2] - 1, +m[1], 12);
      if (!m[3] && iso(d) < h) d.setFullYear(d.getFullYear() + 1);
      fecha = iso(d); quitar(new RegExp(m[0].replace(/[\/]/g, '\\/')));
    }
    if (!fecha && (m = low.match(/\b(?:el\s+)?(\d{1,2})\s+de\s+([a-z]+)\b/))) {
      const mi = MESES.map(sinAcentos).indexOf(m[2]);
      if (mi >= 0) {
        const d = new Date(deIso(h).getFullYear(), mi, +m[1], 12);
        if (iso(d) < h) d.setFullYear(d.getFullYear() + 1);
        fecha = iso(d); quitar(new RegExp('(\\bel\\s+)?' + m[1] + '\\s+de\\s+' + MESES[mi], 'i'));
      }
    }
    const diasSin = DIAS.map(sinAcentos);
    const diaRe = (i) => diasSin[i].replace(/[aeio]/g, (v) => '[' + v + ({ a: 'á', e: 'é', i: 'í', o: 'ó' })[v] + ']'); // acepta "sábado" y "sabado"
    // "lunes 21": el número es el día del mes; el nombre del día solo acompaña.
    if (!fecha && (m = low.match(new RegExp('\\b(?:el\\s+)?(' + diasSin.join('|') + ')\\s+(\\d{1,2})\\b(?!\\s*(:|hs|h\\b|horas))')))) {
      const d = deIso(h); d.setDate(+m[2]); if (iso(d) < h) d.setMonth(d.getMonth() + 1);
      fecha = iso(d); quitar(new RegExp('(\\bel\\s+)?' + diaRe(diasSin.indexOf(m[1])) + '\\s+' + m[2] + '\\b', 'i'));
    }
    if (!fecha) {
      for (let i = 0; i < 7; i++) {
        const re = new RegExp('\\b(el\\s+)?' + diasSin[i] + '(\\s+que\\s+viene|\\s+proximo)?\\b');
        const mm = low.match(re);
        if (mm) {
          const d = deIso(h); let diff = (i - d.getDay() + 7) % 7;
          if (diff === 0) diff = 7;
          if (mm[2]) diff += diff < 7 ? 7 : 0;
          fecha = addDias(h, diff);
          quitar(new RegExp('(\\bel\\s+)?' + diaRe(i) + '(\\s+que\\s+viene|\\s+pr[oó]ximo)?', 'i'));
          break;
        }
      }
    }
    if (!fecha && (m = low.match(/\bel\s+(\d{1,2})\b(?!\s*(:|hs|h\b|de))/))) {
      const d = deIso(h); d.setDate(+m[1]); if (iso(d) < h) d.setMonth(d.getMonth() + 1);
      fecha = iso(d); quitar(new RegExp('\\bel\\s+' + m[1] + '\\b', 'i'));
    }

    // Hora (sobre el texto ya sin la fecha, para que "20/9" no se lea como hora)
    let hora = null;
    const low2 = sinAcentos(restoTitulo.toLowerCase());
    if ((m = low2.match(/\b(?:a\s+las?\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(hs|h|horas)?\b/))) {
      const tieneMarca = /a\s+las?\s+/.test(m[0]) || m[3];
      const n = +m[1];
      if (tieneMarca && n >= 0 && n <= 23) {
        // "a las 5 y media de la tarde" → 17:30
        const resto = low2.slice(low2.indexOf(m[0]) + m[0].length);
        const extra = resto.match(/^\s*y\s+(media|cuarto)\b/);
        const parte = resto.match(/^\s*(?:y\s+(?:media|cuarto)\s+)?de\s+la\s+(manana|tarde|noche)\b/);
        const tarde = parte && parte[1] !== 'manana';
        hora = pad(tarde && n < 12 ? n + 12 : n) + ':' + (m[2] || (extra ? (extra[1] === 'media' ? '30' : '15') : '00'));
        quitar(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
        if (extra) quitar(/\by\s+(media|cuarto)\b/i);
        if (parte) quitar(/\bde\s+la\s+(mañana|manana|tarde|noche)\b/i);
      }
    }

    // Qué es: hora o palabra de compromiso → agenda. Fecha sola → agenda, salvo que empiece con un verbo de tarea
    // ("pagar la VTV el jueves" es una tarea con fecha; "gestor el jueves" es un compromiso).
    const esEvento = !!hora || /\b(turno|reunion|cita|junta|entrega|entrego|viaje|vuelo|cumple|cumpleanos|visita|voy a ver|ver el auto|ver la|muestro|mostrar el|viene a ver|vienen a ver)\b/.test(low);
    const verboTarea = /^(llamar|comprar|pagar|hacer|mandar|pasar|buscar|llevar|traer|revisar|cargar|subir|publicar|terminar|arreglar|pedir|avisar|escribir|enviar|cobrar|preparar|lavar|limpiar|sacar|renovar|imprimir|firmar|responder|contestar|armar|editar|grabar|filmar|ordenar|organizar|vender|cambiar|chequear|controlar|consultar|preguntar|reservar|retirar|averiguar|anotar|leer|estudiar|practicar|entrenar|pensar|definir|decidir|resolver|conseguir|comprarle|pagarle|mandarle|avisarle|pedirle|llamarlo|llamarla)\b/.test(low);
    const tipo = forzado || ((esEvento || (fecha && !verboTarea)) ? 'evento' : 'tarea');
    titulo = cap(restoTitulo.replace(/\s{2,}/g, ' ').replace(/^\s*(el|la|a)\s+/i, '').replace(/(\s+(el|la|los|las|a|en|de|del|para|por|antes|hasta))+\s*$/i, '').trim()) || raw;

    if (tipo === 'evento') return { tipo, titulo, fecha: fecha || h, hora, area: detectarArea(low) };
    return { tipo: 'tarea', titulo, fecha, area: detectarArea(low) };
  }
  function detectarArea(low) {
    if (/\balezza\b|\btaller\b|\bcliente\b|\binstagram\b|\bpublicar\b|\breel\b/.test(low)) return 'ALEZZA';
    if (/\bautos?\b|\bsuran\b|\bgol\b|\bcorsa\b|\bclio\b|\bpartner\b|\bvehiculo\b|\bcamioneta\b|\bmecanic|\bverificaci|\bregistro\b|\bvtv\b|\btransferencia\b|\bgestor\b|\bpatente|\bcubiertas?\b|\bgnc\b|\bnafta\b/.test(low)) return 'Autos';
    if (/\bentren|\bgym\b|\bgimnasio\b|\bcorrer\b|\bdormir\b|\bmedico\b|\bdentista\b/.test(low)) return 'Cuerpo';
    if (/\bdj\b|\bset\b|\bmusica\b|\bmezcla\b|\bableton\b|\btema\b/.test(low)) return 'Música';
    if (/\bbruno os\b|\bapp\b|\bsistema\b|\bclaude\b|\bautomatiz|\bcodigo\b/.test(low)) return 'Sistemas';
    return 'Personal';
  }

  // ---------- Consultas ----------
  const pendientes = () => items().filter((x) => x.tipo === 'tarea' && x.estado !== 'hecha');
  const hechas = () => items().filter((x) => x.tipo === 'tarea' && x.estado === 'hecha').sort((a, b) => (b.hecho || '').localeCompare(a.hecho || ''));
  const eventosDe = (f) => items().filter((x) => x.tipo === 'evento' && x.fecha === f && x.estado !== 'hecha').sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));
  function prioridades() {
    const h = hoy();
    return pendientes()
      .map((t) => ({ t, peso: (t.prioridad ? 0 : 10) + (t.fecha ? (t.fecha < h ? 1 : t.fecha === h ? 2 : 3) : 5) }))
      .sort((a, b) => a.peso - b.peso || (a.t.fecha || '9').localeCompare(b.t.fecha || '9'))
      .map((x) => x.t);
  }

  // ---------- Nube (Supabase vía window.BRUNO_NUBE, que arma src/app/os/BrunoOS.tsx) ----------
  const nube = window.BRUNO_NUBE;
  const CLAVE_USUARIO = CLAVE + '.' + nube.usuario;
  const CLAVE_COLA = CLAVE_USUARIO + '.cola';
  let cola = new Set();
  let estadoNube = 'sincronizando'; // 'ok' | 'sin-conexion' | 'sincronizando'
  function leerLocal() {
    try {
      const raw = localStorage.getItem(CLAVE_USUARIO);
      if (raw) { const d = JSON.parse(raw); if (d && Array.isArray(d.items)) datos = d; }
      cola = new Set(JSON.parse(localStorage.getItem(CLAVE_COLA) || '[]'));
    } catch (e) { /* arranca vacío y lo trae la nube */ }
  }
  function guardarLocal() {
    try { localStorage.setItem(CLAVE_USUARIO, JSON.stringify(datos)); localStorage.setItem(CLAVE_COLA, JSON.stringify([...cola])); }
    catch (e) { /* sin espacio: igual se sube */ }
  }
  function guardar(...ids) {
    ids.forEach((id) => cola.add(id));
    guardarLocal();
    enviar();
  }
  let enviando = false;
  async function enviar() {
    if (enviando || !cola.size) return;
    enviando = true;
    try {
      while (cola.size) {
        const ids = [...cola];
        const foto = new Map(ids.map((id) => [id, JSON.stringify(datos.items.find((x) => x.id === id) || null)]));
        const vivos = ids.map((id) => datos.items.find((x) => x.id === id)).filter(Boolean);
        const muertos = ids.filter((id) => !datos.items.some((x) => x.id === id));
        if (vivos.length) await nube.guardar(vivos);
        if (muertos.length) await nube.borrar(muertos);
        // Solo sale de la cola lo que no cambió mientras se subía.
        ids.forEach((id) => { if (JSON.stringify(datos.items.find((x) => x.id === id) || null) === foto.get(id)) cola.delete(id); });
        guardarLocal();
      }
      ponerEstado('ok');
    } catch (e) {
      ponerEstado('sin-conexion');
    } finally { enviando = false; }
  }
  async function sincronizar() {
    await enviar();
    if (cola.size) return; // sin conexión: no pisar lo local
    try {
      const remotos = await nube.listar();
      datos = { version: 4, items: remotos };
      guardarLocal();
      ponerEstado('ok');
      if (!$('.sheet') && !(document.activeElement && document.activeElement.matches('.caja input'))) render();
    } catch (e) { ponerEstado('sin-conexion'); }
  }
  function ponerEstado(e) {
    if (e === estadoNube) return;
    estadoNube = e;
    if (e === 'sin-conexion') aviso('Sin conexión. Los cambios se suben cuando vuelva.');
    const el = $('#estado-nube'); if (el) el.outerHTML = indicadorNube();
  }
  const indicadorNube = () => '<span id="estado-nube" class="nube ' + estadoNube + '">' +
    (estadoNube === 'ok' ? 'Guardado' : estadoNube === 'sin-conexion' ? cola.size + ' sin subir' : 'Sincronizando…') + '</span>';
  // Suma una copia (.json) a lo que ya hay; el mismo id se actualiza. Todo pasa por nube.limpiar (validación).
  function sumarItems(lista) {
    const limpios = lista.filter((x) => x && typeof x === 'object').map(nube.limpiar);
    const ids = new Set(datos.items.map((x) => x.id));
    limpios.forEach((x) => { if (!ids.has(x.id)) datos.items.push(x); else datos.items[datos.items.findIndex((y) => y.id === x.id)] = x; });
    datos.items.sort((a, b) => String(b.creado).localeCompare(String(a.creado)));
    guardar(...limpios.map((x) => x.id));
    render();
  }

  // ---------- Estado de la interfaz ----------
  let vista = 'inicio';
  let busqueda = '';
  let verHechas = false;
  let toastTimer = null;
  let tipoElegido = null; // chip tocado debajo de la caja de Inicio; se limpia al anotar

  // ---------- Render ----------
  const app = $('#app');
  const nav = $('#nav');

  let vistaPintada = null;
  function render() {
    const vistas = { inicio, agenda, ideas, apps, buscar, ajustes };
    const cambioSeccion = vista !== vistaPintada;
    const y = window.scrollY;
    app.innerHTML = (vistas[vista] || inicio)();
    renderNav();
    if (vista === 'buscar') { const i = $('#q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
    // Solo sube al cambiar de sección; al tildar o anotar se queda donde estabas.
    if (cambioSeccion) window.scrollTo(0, 0); else window.scrollTo(0, y);
    vistaPintada = vista;
  }
  function renderNav() {
    const tabs = [['inicio', 'Inicio'], ['agenda', 'Agenda'], ['ideas', 'Ideas'], ['apps', 'Portales']];
    nav.innerHTML = '<span class="marca">BRUNO<b>OS</b></span>' + tabs.map(([v, l]) => '<button type="button" data-ir="' + v + '" class="' + (vista === v ? 'on' : '') + '">' + l + '</button>').join('');
  }
  const svgCheck = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3 3 7-7"/></svg>';

  function filaTarea(t) {
    const h = hoy();
    const vencida = t.fecha && t.fecha < h && t.estado !== 'hecha';
    const meta = [t.fecha ? relativo(t.fecha) : '', t.prioridad ? 'prioridad' : ''].filter(Boolean).join(' · ');
    return '<div class="fila' + (t.estado === 'hecha' ? ' hecha' : '') + '" data-abrir="' + t.id + '">' +
      '<button type="button" class="check' + (t.estado === 'hecha' ? ' on' : '') + '" data-hecha="' + t.id + '" aria-label="Completar">' + (t.estado === 'hecha' ? svgCheck : '') + '</button>' +
      '<div><div class="titulo">' + esc(t.titulo) + '</div>' + (meta ? '<div class="meta' + (vencida ? ' roja' : '') + '">' + meta + '</div>' : '') + '</div></div>';
  }
  // Misma fila que una tarea: tilde para marcarla hecha; el cuándo va en la línea de abajo.
  function filaEvento(e, conFecha) {
    const hecha = e.estado === 'hecha';
    const meta = [conFecha ? cap(relativo(e.fecha)) : '', e.hora].filter(Boolean).join(' · ');
    return '<div class="fila' + (hecha ? ' hecha' : '') + '" data-abrir="' + e.id + '">' +
      '<button type="button" class="check' + (hecha ? ' on' : '') + '" data-hecha="' + e.id + '" aria-label="Completar">' + (hecha ? svgCheck : '') + '</button>' +
      '<div><div class="titulo">' + esc(e.titulo) + '</div>' + (meta ? '<div class="meta cuando">' + meta + '</div>' : '') + '</div></div>';
  }
  function filaIdea(x) {
    return '<div class="fila sola" data-abrir="' + x.id + '">' +
      '<div><div class="titulo">' + esc(x.titulo) + '</div><div class="meta">' + relativo(iso(new Date(x.creado))) + '</div></div></div>';
  }
  // Caja de cada sección: lo que se escribe acá va derecho a ese tipo. En Inicio la app decide.
  // Dictado con el reconocimiento de voz del navegador (Edge/Chrome). Sin soporte, no aparece el botón.
  const Reco = window.SpeechRecognition || window.webkitSpeechRecognition;
  const MIC = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
  function caja(tipo, placeholder) {
    return '<form class="caja' + (Reco ? ' con-mic' : '') + '" data-rapida="' + (tipo || '') + '"><input type="text" name="texto" placeholder="' + placeholder + '" autocomplete="off" autocapitalize="sentences" enterkeyhint="send"><button type="submit" aria-label="Anotar">↑</button>' +
      (Reco ? '<button type="button" class="mic" data-mic aria-label="Dictar (tecla M)" title="Dictar (tecla M)">' + MIC + '</button>' : '') + '</form>';
  }
  let reco = null;
  // El dictado trae números en palabras ("el veinte a las cinco"): se pasan a cifras para que fecha y hora se lean bien.
  const NUM = { dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintiun: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30 };
  function normalizarDictado(t) {
    return t
      .replace(/\btreinta y un[oa]?\b/gi, '31')
      .replace(/\b(a la|el) un[oa]\b/gi, '$1 1')
      .replace(/[a-záéíóúñ]+/gi, (w) => NUM[sinAcentos(w.toLowerCase())] || w)
      .replace(/\b(\d{1,2}) y (\d{1,2})\b/g, (x, a, b) => (+a === 20 ? String(20 + +b) : x))
      .replace(/\s+([.,])/g, '$1').replace(/\s{2,}/g, ' ');
  }
  function dictar() {
    if (!Reco) return;
    if (reco) { reco.stop(); return; }
    const campo = () => $('.caja [name=texto]');
    const i = campo(); if (!i) return;
    const previo = i.value.trim() ? i.value.trim() + ' ' : '';
    let final = '';
    // Continuo: no corta en la primera pausa; termina tras 2,5 s de silencio, con M o tocando el micrófono.
    reco = new Reco(); reco.lang = 'es-AR'; reco.interimResults = true; reco.continuous = true; reco.maxAlternatives = 3;
    let silencio = null;
    reco.onresult = (e) => {
      let parcial = ''; final = '';
      for (const r of e.results) {
        const mejor = Array.from(r).reduce((a, b) => (b.confidence > a.confidence ? b : a)); // la alternativa más segura
        if (r.isFinal) final += mejor.transcript + ' '; else parcial += mejor.transcript;
      }
      const c = campo(); if (c) c.value = normalizarDictado(previo + final + parcial);
      clearTimeout(silencio); silencio = setTimeout(() => reco && reco.stop(), 2500);
    };
    reco.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') aviso('Permití el micrófono para dictar');
      else if (e.error !== 'no-speech' && e.error !== 'aborted') aviso('No se pudo dictar');
    };
    reco.onend = () => {
      reco = null; clearTimeout(silencio);
      document.querySelectorAll('[data-mic]').forEach((b) => b.classList.remove('on'));
      const c = campo();
      // No se guarda solo: queda en la caja para revisar y se anota con Enter (así no se cuela algo mal entendido).
      if (final.trim() && c) { c.value = c.value.trim(); c.focus(); aviso('Revisá lo dictado y apretá Enter'); }
    };
    i.focus(); // con foco en la caja, la sincronización no re-dibuja mientras se dicta
    document.querySelectorAll('[data-mic]').forEach((b) => b.classList.add('on'));
    reco.start();
  }
  const cabecera = (t, sub, extra) => '<header class="cab"><div class="cab-fila"><h1>' + t + '</h1>' + (extra || '') + '</div>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</header>';
  const seccion = (t, cuerpo) => '<section class="seccion"><h2>' + t + '</h2><div class="lista">' + cuerpo + '</div></section>';

  // ----- Inicio: todo lo del día a mano, sin bajar -----
  function inicio() {
    const h = hoy();
    // Lo de hoy y lo de los próximos 7 días, en la misma lista.
    const evs = []; for (let i = 0; i <= 7; i++) evs.push(...eventosDe(addDias(h, i)));
    const tareas = verHechas ? hechas().slice(0, 30) : prioridades();
    const hora = new Date().getHours();
    const saludo = hora < 6 ? 'Buenas noches' : hora < 13 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
    const pend = pendientes();
    const vencidas = pend.filter((t) => t.fecha && t.fecha < h).length;
    const instrumento = (etq, n, clase) => '<div class="instrumento' + (clase ? ' ' + clase : '') + '"><span class="etq">' + etq + '</span><span class="valor">' + n + '</span></div>';
    return '<header class="hero">' +
        '<div><p class="etiqueta">' + saludo + ' · ' + indicadorNube() + '</p><h1>' + cap(diaLargo(h)) + '</h1><p id="dolar" class="dolar">' + dolarTexto() + '</p></div>' +
        '<div class="hero-der"><span id="reloj" class="reloj">' + reloj() + '</span><span class="acciones"><button type="button" data-ir="buscar">Buscar</button><button type="button" data-ir="ajustes">Ajustes</button></span></div>' +
      '</header>' +
      '<div class="instrumentos">' +
        instrumento('Hoy', eventosDe(h).length) + instrumento('Semana', evs.length) +
        instrumento('Pendientes', pend.length) + instrumento('Vencidas', vencidas, vencidas ? 'alerta' : '') +
      '</div>' +
      caja('', 'Anotar algo… (tecla / · M para dictar)') +
      '<div class="chips">' + ['evento', 'tarea', 'idea'].map((k) => '<button type="button" class="chip' + (tipoElegido === k ? ' on' : '') + '" data-elegir="' + k + '">' + TIPOS[k] + '</button>').join('') + '</div>' +
      portales() +
      // En escritorio, dos columnas; en el teléfono, una debajo de otra.
      '<div class="tablero">' +
      seccion('Agenda · 7 días', evs.length ? evs.map((e) => filaEvento(e, true)).join('') : '<div class="vacio">Nada agendado esta semana.</div>') +
      seccion(verHechas ? 'Hechas' : 'Pendientes',
        (tareas.length ? tareas.map(filaTarea).join('') : '<div class="vacio">' + (verHechas ? 'Nada terminado todavía.' : 'Nada pendiente.') + '</div>') +
        '<button type="button" class="ver" data-hechas>' + (verHechas ? 'Ver pendientes' : 'Ver hechas') + '</button>') +
      '</div>';
  }
  const reloj = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };

  // ----- Agenda -----
  function agenda() {
    const h = hoy();
    const evs = items().filter((x) => x.tipo === 'evento').sort((a, b) => (a.fecha + (a.hora || '99')).localeCompare(b.fecha + (b.hora || '99')));
    const futuros = evs.filter((e) => e.fecha >= h && e.estado !== 'hecha');
    const pasados = evs.filter((e) => e.fecha < h).reverse().slice(0, 15);
    const grupos = {}; futuros.forEach((e) => { (grupos[e.fecha] = grupos[e.fecha] || []).push(e); });
    const fechas = Object.keys(grupos).sort();
    let html = cabecera('Agenda') + caja('evento', 'Qué y cuándo. Ej.: gestor el jueves a las 10');
    if (!fechas.length) html += '<div class="vacio">Nada agendado.</div>';
    fechas.forEach((f) => {
      const pref = f === h ? 'Hoy, ' : f === addDias(h, 1) ? 'Mañana, ' : '';
      html += seccion(pref + diaLargo(f), grupos[f].map((e) => filaEvento(e, false)).join(''));
    });
    if (pasados.length) html += seccion('Pasados', pasados.map((e) => filaEvento(e, true)).join(''));
    return html;
  }

  // ----- Ideas -----
  function ideas() {
    const lista = items().filter((x) => x.tipo === 'idea' || x.tipo === 'nota');
    return cabecera('Ideas') + caja('idea', 'Una idea, tal cual venga') +
      '<div class="lista">' + (lista.length ? lista.map(filaIdea).join('') : '<div class="vacio">Nada todavía.</div>') + '</div>';
  }

  // ----- Apps -----
  // Portales: todas las páginas de ALEZZA (lista en src/app/os/portales.ts).
  function portales() {
    const grupos = {};
    nube.portales.forEach((p) => { (grupos[p.grupo] = grupos[p.grupo] || []).push(p); });
    let i = 0;
    return '<section class="portales-bloque" aria-label="Portales">' + Object.keys(grupos).map((g) =>
      '<div class="grupo"><h2 class="grupo-t">' + esc(g) + '</h2><div class="portales">' + grupos[g].map((p) =>
        '<a class="tile" style="--i:' + (i++) + '" href="' + esc(p.u) + '"><span class="tile-n">' + esc(p.n) + '</span><span class="tile-t">' + esc(p.t) + '</span>' +
        '<span class="tile-d">' + esc(p.d) + '</span><span class="tile-u">' + esc(p.u) + '</span><span class="tile-f" aria-hidden="true">↗</span></a>').join('') +
      '</div></div>').join('') + '</section>';
  }
  function apps() { return cabecera('Apps', 'Todas las páginas y sistemas de ALEZZA') + portales(); }

  // ----- Buscar -----
  function buscar() {
    const q = sinAcentos(busqueda.trim().toLowerCase());
    const res = q ? items().filter((x) => sinAcentos((x.titulo + ' ' + (x.area || '')).toLowerCase()).includes(q)).slice(0, 60) : [];
    return cabecera('Buscar', '', '<span class="acciones"><button type="button" data-ir="inicio">Listo</button></span>') +
      '<div class="caja"><input id="q" type="search" placeholder="Palabra, auto, persona…" value="' + esc(busqueda) + '" autocomplete="off"></div>' +
      '<div class="lista">' + (q ? (res.length ? res.map(filaGenerica).join('') : '<div class="vacio">Nada con “' + esc(busqueda) + '”.</div>') : '') + '</div>';
  }
  function filaGenerica(x) {
    const cuando = x.tipo === 'evento' ? (relativo(x.fecha) + (x.hora ? ' ' + x.hora : '')) : x.fecha ? relativo(x.fecha) : relativo(iso(new Date(x.creado)));
    return '<div class="fila sola' + (x.estado === 'hecha' ? ' hecha' : '') + '" data-abrir="' + x.id + '"><div><div class="titulo">' + esc(x.titulo) + '</div><div class="meta">' + TIPOS[x.tipo] + ' · ' + cuando + '</div></div></div>';
  }

  // ----- Ajustes -----
  function ajustes() {
    const n = datos.items.length;
    return cabecera('Ajustes', '', '<span class="acciones"><button type="button" data-ir="inicio">Listo</button></span>') +
      '<div class="lista">' +
      '<div class="ajuste"><div>Tema<div class="meta">Claro u oscuro, en todos los portales</div></div><button type="button" class="btn" data-cambiar-tema>Cambiar</button></div>' +
      '<div class="ajuste"><div>Cuenta<div class="meta">' + esc(nube.email) + ' · ' + indicadorNube() + '</div></div><button type="button" class="btn" data-salir>Cerrar sesión</button></div>' +
      '<div class="ajuste"><div>Descargar copia<div class="meta">' + n + ' registros en un archivo .json.</div></div><button type="button" class="btn" data-exportar>Descargar</button></div>' +
      '<div class="ajuste"><div>Sumar copia<div class="meta">Sube un .json (p. ej. el del teléfono) a tu cuenta. No borra nada.</div></div><label class="btn" for="importar">Elegir</label><input id="importar" type="file" accept="application/json,.json" hidden></div>' +
      '<div class="ajuste"><div>Borrar todo<div class="meta">Borra todo de tu cuenta. Sin vuelta atrás.</div></div><button type="button" class="btn rojo" data-borrar-todo>Borrar</button></div>' +
      '<div class="ajuste"><div class="meta">BRUNO OS v14 · datos en Supabase, solo visibles para tu cuenta</div></div>' +
      '</div>';
  }

  // ---------- Sheets ----------
  const sheetRoot = $('#sheet-root');
  function abrirSheet(html) { sheetRoot.innerHTML = '<div class="backdrop" data-cerrar></div><div class="sheet" role="dialog"><div class="asa"></div>' + html + '</div>'; }
  function cerrarSheet() { sheetRoot.innerHTML = ''; }

  function formulario(p) {
    const areaSel = '<select name="area">' + AREAS.map((a) => '<option' + (p.area === a ? ' selected' : '') + '>' + a + '</option>').join('') + '</select>';
    let campos = '<div class="campo"><label>Qué es</label><div class="chips">' + Object.keys(TIPOS).map((k) => '<button type="button" class="chip' + (p.tipo === k ? ' on' : '') + '" data-tipo="' + k + '">' + TIPOS[k] + '</button>').join('') + '</div></div>' +
      '<div class="campo"><label>Título</label><input name="titulo" value="' + esc(p.titulo) + '" autocomplete="off"></div>';
    if (p.tipo === 'evento') campos += '<div class="campo dos"><div><label>Fecha</label><input name="fecha" type="date" value="' + (p.fecha || hoy()) + '"></div><div><label>Hora</label><input name="hora" type="time" value="' + (p.hora || '') + '"></div></div>';
    if (p.tipo === 'tarea') campos += '<div class="campo dos"><div><label>Para cuándo</label><input name="fecha" type="date" value="' + (p.fecha || '') + '"></div><div><label>Prioridad</label><label class="switch"><input type="checkbox" name="prioridad"' + (p.prioridad ? ' checked' : '') + '><span></span></label></div></div>';
    campos += '<div class="campo"><label>Área</label>' + areaSel + '</div>';
    return campos;
  }
  let propuesta = null;
  function sheetConfirmar(p, esEdicion) {
    propuesta = p;
    abrirSheet('<form id="form-item"><div class="sheet-cab"><button type="button" data-cerrar>Cancelar</button><h2>' + (esEdicion ? 'Editar' : 'Nuevo') + '</h2><button type="submit" class="fuerte">Guardar</button></div>' +
      formulario(p) +
      (esEdicion ? '<button type="button" class="eliminar" data-eliminar="' + p.id + '">Eliminar</button>' : '') + '</form>');
  }
  function leerFormulario(form) {
    const fd = new FormData(form);
    const p = Object.assign({}, propuesta);
    p.titulo = (fd.get('titulo') || '').toString().trim();
    if (fd.has('fecha')) p.fecha = fd.get('fecha') || null;
    if (fd.has('hora')) p.hora = fd.get('hora') || null;
    if (fd.has('area')) p.area = fd.get('area');
    if (p.tipo === 'tarea') p.prioridad = fd.get('prioridad') === 'on'; else delete p.prioridad;
    if (p.tipo === 'evento' && !p.fecha) p.fecha = hoy();
    if (p.tipo !== 'evento') delete p.hora;
    if (p.tipo !== 'evento' && p.tipo !== 'tarea') delete p.fecha;
    return p;
  }

  // ---------- Aviso ----------
  let deshacerFn = null;
  function aviso(texto, deshacer, etiqueta) {
    clearTimeout(toastTimer);
    const viejo = $('.toast'); if (viejo) viejo.remove();
    deshacerFn = deshacer || null;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<span>' + esc(texto) + '</span>' + (deshacer ? '<button type="button" data-deshacer>' + (etiqueta || 'Deshacer') + '</button>' : '');
    document.body.appendChild(el);
    toastTimer = setTimeout(() => el.remove(), deshacer ? 4500 : 1800);
    // Se saca con un toque (fuera del botón) o deslizándolo hacia arriba.
    let y0 = null;
    el.addEventListener('click', (e) => { if (!e.target.closest('[data-deshacer]')) el.remove(); });
    el.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchmove', (e) => { if (y0 == null) return; const dy = e.touches[0].clientY - y0; if (dy < 0) el.style.transform = 'translateY(' + dy + 'px)'; if (dy < -30) { el.remove(); y0 = null; } }, { passive: true });
    el.addEventListener('touchend', () => { el.style.transform = ''; y0 = null; });
  }
  // Anota directo, sin confirmar. Si viene de la caja de una sección, se acomoda a ese tipo.
  function anotarDirecto(texto, tipoForzado) {
    const p = interpretar(texto);
    if (tipoForzado && p.tipo !== tipoForzado) {
      const fecha = p.fecha || null; const hora = p.hora || null;
      Object.keys(p).forEach((k) => { if (k !== 'titulo' && k !== 'area') delete p[k]; });
      p.tipo = tipoForzado;
      if (tipoForzado === 'evento') { p.fecha = fecha || hoy(); p.hora = hora; }
      if (tipoForzado === 'tarea') p.fecha = fecha;
    }
    const it = agregar(p);
    render();
    const donde = it.tipo === 'evento' ? [relativo(it.fecha), it.hora].filter(Boolean).join(' ') : (it.tipo === 'tarea' && it.fecha) ? relativo(it.fecha) : '';
    aviso(TIPOS[it.tipo] + (donde ? ' · ' + donde : '') + ' · ' + it.titulo, () => sheetConfirmar(Object.assign({}, it), true), 'Cambiar');
    return it;
  }

  // ---------- Copia de seguridad ----------
  async function exportar() {
    const nombre = 'bruno-os-' + hoy() + '.json';
    const json = JSON.stringify(datos, null, 1);
    const archivo = new File([json], nombre, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try { await navigator.share({ files: [archivo], title: 'BRUNO OS · copia' }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  }
  function importar(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || !Array.isArray(d.items) || d.items.length > 20000) throw new Error('formato');
        if (!confirm('Se suman ' + d.items.length + ' registros del archivo a tu cuenta. Lo que ya está no se borra. ¿Seguimos?')) return;
        vista = 'inicio'; sumarItems(d.items); aviso('Copia sumada · ' + d.items.length + ' registros');
      } catch (e) { aviso('Ese archivo no es una copia de BRUNO OS'); }
    };
    r.readAsText(file);
  }

  // ---------- Eventos (delegados) ----------
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-ir],[data-hecha],[data-hechas],[data-abrir],[data-tipo],[data-cerrar],[data-eliminar],[data-deshacer],[data-exportar],[data-borrar-todo],[data-elegir],[data-salir],[data-mic],[data-cambiar-tema]');
    if (!t) return;
    if (t.dataset.cambiarTema != null) {
      // Misma lógica que src/lib/tema.ts
      const tema = document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
      document.documentElement.dataset.tema = tema;
      try { localStorage.setItem('tema', tema); } catch (e) {}
      return;
    }
    if (t.dataset.mic != null) { dictar(); return; }
    if (t.dataset.elegir) { tipoElegido = tipoElegido === t.dataset.elegir ? null : t.dataset.elegir; document.querySelectorAll('[data-elegir]').forEach((c) => c.classList.toggle('on', c.dataset.elegir === tipoElegido)); const i = $('.caja [name=texto]'); if (i) i.focus(); return; }
    if (t.dataset.ir != null) { vista = t.dataset.ir; if (vista === 'buscar') busqueda = ''; render(); return; }
    if (t.dataset.hechas != null) { verHechas = !verHechas; render(); return; }
    if (t.dataset.hecha) {
      ev.stopPropagation();
      const it = items().find((x) => x.id === t.dataset.hecha); if (!it) return;
      const hecha = it.estado !== 'hecha';
      actualizar(it.id, { estado: hecha ? 'hecha' : 'pendiente', hecho: hecha ? new Date().toISOString() : null });
      render();
      if (hecha) aviso('Hecha', () => { actualizar(it.id, { estado: 'pendiente', hecho: null }); render(); });
      return;
    }
    if (t.dataset.abrir) { const it = items().find((x) => x.id === t.dataset.abrir); if (it) sheetConfirmar(Object.assign({}, it), true); return; }
    if (t.dataset.tipo) { const p = leerFormulario($('#form-item')); p.tipo = t.dataset.tipo; sheetConfirmar(p, !!p.id); return; }
    if (t.dataset.cerrar != null) { cerrarSheet(); return; }
    if (t.dataset.eliminar) {
      const g = borrar(t.dataset.eliminar); cerrarSheet(); render();
      if (g) aviso('Eliminado', () => { restaurar(g); render(); });
      return;
    }
    if (t.dataset.deshacer != null) { const fn = deshacerFn; deshacerFn = null; const el = $('.toast'); if (el) el.remove(); if (fn) fn(); return; }
    if (t.dataset.exportar != null) { exportar(); return; }
    if (t.dataset.borrarTodo != null) {
      if (prompt('Se borran ' + datos.items.length + ' registros de tu cuenta, sin vuelta atrás. Escribí BORRAR para confirmar.') === 'BORRAR') {
        const ids = datos.items.map((x) => x.id); datos = { version: 4, items: [] }; guardar(...ids); vista = 'inicio'; render(); aviso('Todo borrado');
      }
      return;
    }
    if (t.dataset.salir != null) {
      if (cola.size && !confirm('Hay ' + cola.size + ' cambios sin subir y se pierden al salir. ¿Salir igual?')) return;
      try { localStorage.removeItem(CLAVE_USUARIO); localStorage.removeItem(CLAVE_COLA); } catch (e) { /* nada */ }
      nube.salir();
      return;
    }
  });

  document.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (ev.target.matches('[data-rapida]')) {
      const f = ev.target; const texto = (f.texto.value || '').trim();
      if (!texto) { f.texto.focus(); return; }
      const tipo = f.dataset.rapida || tipoElegido; tipoElegido = null;
      anotarDirecto(texto, tipo || null);
      const i = $('.caja [name=texto]'); if (i) i.focus();
      return;
    }
    if (!ev.target.matches('#form-item')) return;
    const p = leerFormulario(ev.target);
    if (!p.titulo) { $('input[name=titulo]').focus(); return; }
    if (p.id) { actualizar(p.id, p); aviso('Guardado'); }
    else { agregar(p); aviso(TIPOS[p.tipo] + ' anotada'); }
    cerrarSheet();
    render();
  });

  document.addEventListener('input', (ev) => {
    if (ev.target.matches('#q')) { busqueda = ev.target.value; const lista = $('.lista'); if (lista) { const tmp = document.createElement('div'); tmp.innerHTML = buscar(); lista.replaceWith(tmp.querySelector('.lista')); } }
  });
  document.addEventListener('change', (ev) => {
    if (ev.target.matches('#importar') && ev.target.files[0]) importar(ev.target.files[0]);
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') cerrarSheet();
    // Atajos de escritorio, fuera de los campos: "/" anota, 1-4 cambia de sección.
    if (!ev.target.matches('input, select, textarea') && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !$('.sheet')) {
      const secciones = { 1: 'inicio', 2: 'agenda', 3: 'ideas', 4: 'apps' };
      if (ev.key === '/') { ev.preventDefault(); if (vista !== 'inicio') { vista = 'inicio'; render(); } const i = $('.caja [name=texto]'); if (i) i.focus(); }
      else if (secciones[ev.key]) { vista = secciones[ev.key]; render(); }
      else if ((ev.key === 'm' || ev.key === 'M') && Reco) { ev.preventDefault(); if (vista !== 'inicio') { vista = 'inicio'; render(); } dictar(); }
    }
    if (ev.key === 'Enter' && ev.target.matches('.caja input[name=texto]')) { ev.preventDefault(); ev.target.form.requestSubmit(); }
  });

  // Dólar de hoy (/api/dolar → dolarapi.com). Se actualiza cada 10 minutos sin re-dibujar la pantalla.
  let dolarHoy = null;
  function dolarTexto() {
    if (!dolarHoy) return 'Dólar: cargando…';
    const m = (d) => d ? '$' + Math.round(d.venta).toLocaleString('es-AR') : 'sin dato';
    const f = dolarHoy.blue || dolarHoy.oficial;
    const hora = f && f.fecha ? ' · act. ' + new Date(f.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';
    return 'Dólar blue ' + m(dolarHoy.blue) + ' · Oficial ' + m(dolarHoy.oficial) + hora;
  }
  async function cargarDolar() {
    try { dolarHoy = await (await fetch('/api/dolar')).json(); } catch { /* queda el último dato */ }
    const d = $('#dolar'); if (d) d.textContent = dolarHoy ? dolarTexto() : 'Dólar: sin conexión';
  }

  // ---------- Arranque ----------
  leerLocal();
  render();
  sincronizar();
  cargarDolar();
  setInterval(cargarDolar, 600000);
  setInterval(() => { const r = $('#reloj'); if (r) r.textContent = reloj(); }, 15000);
  // Al volver a la pestaña o recuperar conexión, trae lo cargado desde otro equipo.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sincronizar(); });
  window.addEventListener('online', sincronizar);
})();
