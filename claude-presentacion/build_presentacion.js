// =============================================================================
// Genera ProyectoAED_presentacion.pptx a partir de las figuras de ./figuras y ./assets
// Uso (desde claude-presentacion/):  Rscript figuras.R && node build_presentacion.js
// =============================================================================
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa6");

let applyTheme = null;
try {
  ({ applyTheme } = require("./tools/apply_theme.js")); // escribe la paleta en el tema del .pptx
} catch (e) {
  applyTheme = null; // sin el script, se escribe igualmente el tema a mano (ver final)
}

const OUT = "ProyectoAED_presentacion.pptx";
const FIG = (f) => path.join(__dirname, "figuras", f);
const ASSET = (f) => path.join(__dirname, "assets", f);

// ---- Tema ------------------------------------------------------------------
const THEME = {
  name: "Valencia Transporte",
  headFontFace: "Arial",
  bodyFontFace: "Arial",
  colors: {
    dk1: "1B2430", lt1: "FFFFFF", dk2: "0F2C3F", lt2: "EEF2F5",
    accent1: "F28C28", // naranja (taronja): acento principal
    accent2: "2A78D6", // Valenbisi
    accent3: "E2001A", // EMT
    accent4: "FCD116", // FGV / Metrovalencia
    accent5: "5B7083", // gris pizarra: texto secundario
    accent6: "9E2324", // rojo oscuro: desierto
    hlink: "2A78D6", folHlink: "5B7083",
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
pres.title = "¿Dónde llega el transporte público en València?";
pres.author = "Sara Marquínez Díaz, Ángel Lapeña López, Javier Rodríguez Jiménez";
pres.company = "Universitat de València";
pres.subject = "Proyecto de Análisis Exploratorio de Datos";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;
const S = pres.ShapeType;

const W = 13.333, M = 0.6;

// ---- Utilidades ----------------------------------------------------------------
function pngSize(p) {
  const b = fs.readFileSync(p);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
// Coloca una imagen dentro de una caja respetando su proporción
function fitImage(slide, p, box, opts = {}) {
  const { w: iw, h: ih } = pngSize(p);
  const s = Math.min(box.w / iw, box.h / ih);
  const w = iw * s, h = ih * s;
  const ax = opts.alignX || "center", ay = opts.alignY || "center";
  const x = ax === "left" ? box.x : ax === "right" ? box.x + box.w - w : box.x + (box.w - w) / 2;
  const y = ay === "top" ? box.y : ay === "bottom" ? box.y + box.h - h : box.y + (box.h - h) / 2;
  slide.addImage({ path: p, x, y, w, h, altText: opts.alt || "", objectName: opts.name || path.basename(p) });
  return { x, y, w, h };
}

const iconCache = {};
async function icon(name, color = "#FFFFFF", size = 256) {
  const key = `${name}-${color}`;
  if (iconCache[key]) return iconCache[key];
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(fa[name], { color, size: String(size) }));
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  iconCache[key] = "image/png;base64," + buf.toString("base64");
  return iconCache[key];
}

// Hexágono (motivo visual: la rejilla hexagonal del análisis). h = alto; ancho regular = 1.1547·h
function hexagon(slide, x, y, h, fill, text, textOpts = {}) {
  const w = h * 1.1547;
  if (text !== undefined) {
    slide.addText(text, {
      shape: S.hexagon, x, y, w, h, fill: { color: fill }, line: { type: "none" },
      align: "center", valign: "middle", margin: 0, bold: true, fontSize: 18, color: C.background1,
      objectName: `hex-${text}`, ...textOpts,
    });
  } else {
    slide.addShape(S.hexagon, { x, y, w, h, fill: { color: fill }, line: { type: "none" }, objectName: "hexagono" });
  }
  return w;
}
async function hexIcon(slide, x, y, h, fill, iconName, iconColor = "#FFFFFF") {
  const w = hexagon(slide, x, y, h, fill);
  const s = h * 0.5;
  slide.addImage({ data: await icon(iconName, iconColor), x: x + (w - s) / 2, y: y + (h - s) / 2, w: s, h: s, altText: iconName, objectName: `icono-${iconName}` });
  return w;
}
function card(slide, x, y, w, h, fill = C.background2, name = "tarjeta") {
  slide.addShape(S.roundRect, { x, y, w, h, fill: { color: fill }, line: { type: "none" }, rectRadius: 0.12, objectName: name });
}
function txt(slide, text, o) {
  slide.addText(text, { isTextBox: true, margin: 0, fontSize: 16, color: C.text1, valign: "top", ...o });
}
function bullets(items, o = {}) {
  return items.map((t, i) => ({
    text: t,
    options: { bullet: { indent: 16 }, breakLine: i < items.length - 1, paraSpaceAfter: o.space ?? 8 },
  }));
}

// ---- Layouts -------------------------------------------------------------------
pres.defineSlideMaster({
  title: "PORTADA",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 1.75, w: 6.0, h: 2.35, fontSize: 40, bold: true, color: C.background1, align: "left", valign: "bottom", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "subtitulo", type: "body", x: 0.7, y: 4.32, w: 5.9, h: 0.8, fontSize: 18, color: C.background2, align: "left", valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "SECCION",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 5.45, y: 2.45, w: 7.3, h: 1.4, fontSize: 40, bold: true, color: C.background1, align: "left", valign: "bottom", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "subtitulo", type: "body", x: 5.45, y: 4.0, w: 7.3, h: 1.1, fontSize: 20, color: C.background2, align: "left", valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENIDO",
  background: { color: C.background1 },
  margin: [0.5, 0.6, 0.6, 0.6],
  objects: [
    { placeholder: { options: { name: "seccion", type: "body", x: M, y: 0.32, w: 9, h: 0.3, fontSize: 12, bold: true, color: C.accent1, align: "left", valign: "middle", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: M, y: 0.62, w: W - 2 * M, h: 0.8, fontSize: 34, bold: true, color: C.text2, align: "left", valign: "middle", margin: 0 }, text: "" } },
    { text: { text: "Transporte público en València · Análisis Exploratorio de Datos", options: { x: M, y: 7.02, w: 8, h: 0.28, fontSize: 10, color: C.accent5, margin: 0, valign: "middle" } } },
  ],
  slideNumber: { x: W - M - 0.6, y: 7.02, w: 0.6, h: 0.28, fontSize: 10, color: HEX.accent5, align: "right" },
});

function contenido(seccion, titulo, sectionTitle) {
  const s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle });
  s.addText(seccion, { placeholder: "seccion" });
  s.addText(titulo, { placeholder: "title" });
  return s;
}
async function divisor(num, titulo, subtitulo, sectionTitle, iconName) {
  const s = pres.addSlide({ masterName: "SECCION", sectionTitle });
  // racimo de hexágonos (motivo de la rejilla) con el número de sección
  const h = 2.1, w = h * 1.1547, x0 = 0.9, y0 = 3.05;
  hexagon(s, x0, y0, h, C.accent1, num, { fontSize: 60, color: C.background1 });
  const x1 = x0 + 0.75 * w + 0.05, y1 = y0 - h / 2 - 0.03;
  hexagon(s, x1, y1, h, C.accent5);
  s.addImage({ data: await icon(iconName, "#FFFFFF"), x: x1 + (w - 0.85) / 2, y: y1 + (h - 0.85) / 2, w: 0.85, h: 0.85, altText: "", objectName: "icono-seccion" });
  s.addText(titulo, { placeholder: "title" });
  s.addText(subtitulo, { placeholder: "subtitulo" });
  return s;
}

// ---- Datos que aparecen en las diapositivas (calculados con figuras.R) ----------
const csv = (f) => {
  const [head, ...rows] = fs.readFileSync(path.join(__dirname, "datos", f), "utf8").trim().split("\n");
  const parse = (l) => (l.match(/("([^"]|"")*"|[^,]+|(?<=,)(?=,|$)|^(?=,))/g) || []).map((v) => v.replace(/^"|"$/g, "").replace(/""/g, '"'));
  const keys = parse(head);
  return rows.map((r) => Object.fromEntries(parse(r).map((v, i) => [keys[i], v])));
};
const kv = (f) => Object.fromEntries(fs.readFileSync(path.join(__dirname, "datos", f), "utf8").trim().split("\n").map((l) => l.split("=")));
const P1 = kv("stats_p1.txt"), P2 = kv("stats_p2.txt"), DIST = kv("stats_dist.txt");
const pct = (x, d = 0) => (100 * Number(x)).toFixed(d).replace(".", ",") + " %";
const num = (x) => Number(x).toLocaleString("es-ES", { useGrouping: "always" });
const dec = (x, d = 2) => Number(x).toFixed(d).replace(".", ",");

// Estilos de tabla
const TH = { bold: true, color: C.background1, fill: { color: C.text2 }, fontSize: 12, valign: "middle" };
const TD = (i) => ({ fontSize: 12, color: C.text1, fill: { color: i % 2 ? C.background2 : C.background1 }, valign: "middle" });
const tborder = { type: "solid", pt: 0.75, color: "D5DCE3" };

(async () => {
  // =========================================================================
  // 1. PORTADA
  // =========================================================================
  {
    pres.addSection({ title: "Portada" });
    const s = pres.addSlide({ masterName: "PORTADA", sectionTitle: "Portada" });
    txt(s, "PROYECTO FINAL · ANÁLISIS EXPLORATORIO DE DATOS", { x: 0.7, y: 1.25, w: 6.2, h: 0.35, fontSize: 13, bold: true, color: C.accent1, charSpacing: 1 });
    s.addText("¿Dónde llega el transporte público en València?", { placeholder: "title" });
    s.addText([{ text: "Población, Valenbisi, EMT y Metrovalencia,", options: { breakLine: true } }, { text: "barrio a barrio" }], { placeholder: "subtitulo" });
    txt(s, [
      { text: "Sara Marquínez Díaz", options: { breakLine: true } },
      { text: "Ángel Lapeña López", options: { breakLine: true } },
      { text: "Javier Rodríguez Jiménez" },
    ], { x: 0.7, y: 5.4, w: 5.5, h: 0.85, fontSize: 14, color: C.background1, lineSpacingMultiple: 1.05 });
    txt(s, [{ text: "Máster Universitario en Ciencia de Datos · Universitat de València", options: { breakLine: true } }, { text: "Noviembre 2026" }], { x: 0.7, y: 6.4, w: 6.0, h: 0.5, fontSize: 12, color: C.background2 });
    fitImage(s, FIG("portada_hex.png"), { x: 6.85, y: 0.75, w: 6.0, h: 5.5 }, { alt: "Mapa hexagonal de cobertura de Valenbisi en València", name: "mapa-portada" });
    // leyenda mínima de la imagen
    s.addShape(S.rect, { x: 7.35, y: 6.5, w: 0.18, h: 0.18, fill: { color: "3D6A8C" }, line: { type: "none" }, objectName: "ley-1" });
    txt(s, "Valenbisi a ≤ 250 m", { x: 7.6, y: 6.45, w: 2.0, h: 0.28, fontSize: 11, color: C.background2, valign: "middle" });
    s.addShape(S.rect, { x: 9.7, y: 6.5, w: 0.18, h: 0.18, fill: { color: C.accent1 }, line: { type: "none" }, objectName: "ley-2" });
    txt(s, "Sin estación de Valenbisi cercana", { x: 9.95, y: 6.45, w: 3.0, h: 0.28, fontSize: 11, color: C.background2, valign: "middle" });
    s.addNotes(
      "Presentación del grupo y del tema. El mapa de la derecha es un adelanto del resultado final: en azul, la parte de la ciudad que tiene una estación de Valenbisi a menos de 250 m; en naranja y rojo, las zonas que no. " +
      "Idea para abrir: «Si vivís en Malilla o en Sant Pau, ¿tenéis una estación de Valenbisi cerca? Hoy vamos a ver dónde llega cada red de transporte público y si llega a donde vive la gente»."
    );
  }

  // =========================================================================
  // 2. ÍNDICE
  // =========================================================================
  {
    const s = contenido("ÍNDICE", "Hoja de ruta", "Portada");
    const items = [
      ["01", "Introducción", "Contexto, objetivos y preguntas", C.text2],
      ["02", "Datos", "Fuentes abiertas, Excel no estructurados y limpieza", C.text2],
      ["03", "Exploración inicial", "Alcance de cada red y zona de estudio", C.text2],
      ["04", "P1 · Población y transporte", "¿Tienen más oferta los barrios más poblados?", C.accent1],
      ["05", "P2 · Desiertos de Valenbisi", "¿Dónde no hay estación cerca? ¿Quién los cubre?", C.accent1],
      ["06", "Conclusiones", "Respuestas, limitaciones y próximos pasos", C.text2],
    ];
    items.forEach(([n, t, d, col], i) => {
      const cx = i < 3 ? M + 0.1 : 7.0;
      const cy = 1.95 + (i % 3) * 1.6;
      const hw = hexagon(s, cx, cy, 1.0, col, n, { fontSize: 22 });
      txt(s, t, { x: cx + hw + 0.3, y: cy + 0.05, w: 5.0, h: 0.45, fontSize: 21, bold: true, color: C.text2 });
      txt(s, d, { x: cx + hw + 0.3, y: cy + 0.5, w: 4.6, h: 0.7, fontSize: 15, color: C.accent5 });
    });
    s.addNotes(
      "La presentación sigue el mismo orden que el informe. Primero el contexto y las preguntas; después la parte técnica (cómo conseguimos y limpiamos los datos, que era la mitad del objetivo del trabajo); luego una exploración inicial que define la zona de estudio; y finalmente las dos preguntas de investigación, resaltadas en naranja, y las conclusiones. " +
      "Sugerencia: repartir las secciones entre los tres ponentes (por ejemplo, 01-02, 03-04 y 05-06)."
    );
  }

  // =========================================================================
  // 3. TRES REDES
  // =========================================================================
  {
    pres.addSection({ title: "Introducción" });
    const s = contenido("01 · INTRODUCCIÓN", "Tres redes de transporte público", "Introducción");
    const cards = [
      ["FaBicycle", C.accent2, "#FFFFFF", "273", "estaciones de Valenbisi", "Bicicleta pública compartida del Ayuntamiento."],
      ["FaBus", C.accent3, "#FFFFFF", "1.155", "paradas de la EMT", "Autobús urbano municipal de València."],
      ["FaTrainSubway", C.accent4, "#0F2C3F", "143", "estaciones de FGV", "Metrovalencia: metro y tranvía de Ferrocarrils de la Generalitat Valenciana."],
    ];
    const cw = 3.85, gap = (W - 2 * M - 3 * cw) / 2;
    for (let i = 0; i < 3; i++) {
      const [ic, col, icCol, n, lab, desc] = cards[i];
      const x = M + i * (cw + gap), y = 1.75;
      card(s, x, y, cw, 3.75);
      await hexIcon(s, x + 0.35, y + 0.35, 0.85, col, ic, icCol);
      txt(s, n, { x: x + 0.35, y: y + 1.35, w: cw - 0.7, h: 0.9, fontSize: 54, bold: true, color: C.text2, valign: "middle" });
      txt(s, lab, { x: x + 0.35, y: y + 2.3, w: cw - 0.7, h: 0.4, fontSize: 18, bold: true, color: C.text2 });
      txt(s, desc, { x: x + 0.35, y: y + 2.75, w: cw - 0.7, h: 0.8, fontSize: 14, color: C.accent5 });
    }
    txt(s, "¿Se reparten estas redes de forma equilibrada entre los barrios… y entre sus habitantes?", { x: M, y: 5.85, w: W - 2 * M, h: 0.45, fontSize: 20, italic: true, bold: true, color: C.accent1 });
    txt(s, "Fuente: portal de datos abiertos del Ayuntamiento de València (opendata.vlci.valencia.es).", { x: M, y: 6.45, w: W - 2 * M, h: 0.3, fontSize: 12, color: C.accent5 });
    s.addNotes(
      "Tres redes con naturalezas muy distintas: Valenbisi (bici compartida, 273 estaciones), EMT (autobús urbano, 1.155 paradas) y Metrovalencia de FGV (metro y tranvía, 143 estaciones). " +
      "Todas las cifras salen directamente de los ficheros del portal de datos abiertos del Ayuntamiento. La pregunta que motiva el trabajo es si esta oferta está repartida de forma razonable entre los barrios y su población."
    );
  }

  // =========================================================================
  // 4. OBJETIVOS Y PREGUNTAS
  // =========================================================================
  {
    const s = contenido("01 · INTRODUCCIÓN", "Dos objetivos, dos preguntas", "Introducción");
    const objs = [
      ["FaDatabase", "Objetivo técnico", "Trabajar con datos abiertos reales: descargarlos, extraer información de ficheros sin estructura tabular, limpiarlos y organizarlos en formato tidy, aprendiendo a tratar datos geográficos."],
      ["FaCity", "Objetivo práctico", "Aplicar esas herramientas al transporte público valenciano para responder a dos preguntas concretas."],
    ];
    for (let i = 0; i < 2; i++) {
      const y = 1.8 + i * 2.35;
      await hexIcon(s, M, y, 0.8, C.text2, objs[i][0]);
      txt(s, objs[i][1], { x: M + 1.2, y, w: 4.4, h: 0.4, fontSize: 20, bold: true, color: C.text2 });
      txt(s, objs[i][2], { x: M + 1.2, y: y + 0.45, w: 4.4, h: 1.6, fontSize: 15, color: C.text1 });
    }
    const qs = [
      ["P1", "¿Se corresponde la oferta de EMT, Metrovalencia y Valenbisi con la población de cada barrio?"],
      ["P2", "¿Existen zonas sin una estación de Valenbisi cercana? ¿Hasta qué punto las cubren los otros modos?"],
    ];
    qs.forEach(([p, q], i) => {
      const x = 6.55, y = 1.75 + i * 2.5, w = W - M - 6.55, h = 2.2;
      card(s, x, y, w, h, C.text2, `pregunta-${p}`);
      hexagon(s, x + 0.35, y + 0.6, 1.0, C.accent1, p, { fontSize: 24 });
      txt(s, q, { x: x + 1.75, y: y + 0.3, w: w - 2.05, h: h - 0.6, fontSize: 19, bold: true, color: C.background1, valign: "middle" });
    });
    s.addNotes(
      "El trabajo tiene un doble objetivo. El técnico es tan importante como el práctico: trabajar con datos reales, sucios y en formatos poco amigables, y aprender a manejar geometrías. " +
      "El práctico se concreta en dos preguntas: P1, si la oferta de transporte acompaña a la población; y P2, si hay zonas sin Valenbisi cerca (lo que llamaremos desiertos) y si EMT y metro las compensan."
    );
  }

  // =========================================================================
  // 5. DIVISOR · DATOS
  // =========================================================================
  pres.addSection({ title: "Datos" });
  (await divisor("02", "Datos: obtención y limpieza", "De seis fuentes abiertas a dos tablas tidy", "Datos", "FaDatabase")).addNotes(
    "Empezamos por la parte técnica: de dónde salen los datos, qué problemas tenían y cómo los dejamos listos para el análisis."
  );

  // =========================================================================
  // 6. FUENTES
  // =========================================================================
  {
    const s = contenido("02 · DATOS", "Seis fuentes de datos abiertos", "Datos");
    const fuentes = [
      ["FaBicycle", C.accent2, "#FFFFFF", "Valenbisi", "GeoJSON · puntos", "273 estaciones", "Ubicación, bicis disponibles, anclajes libres y totales"],
      ["FaBus", C.accent3, "#FFFFFF", "EMT", "GeoJSON · puntos", "1.155 paradas", "Ubicación, líneas que paran y próximas llegadas"],
      ["FaTrainSubway", C.accent4, "#0F2C3F", "Metrovalencia", "FGV · GeoJSON · puntos", "143 estaciones", "Ubicación, líneas y próximas llegadas"],
      ["FaDrawPolygon", C.text2, "#FFFFFF", "Barrios", "GeoJSON · polígonos", "88 polígonos", "Límites, código de barrio y de distrito, área"],
      ["FaMap", C.text2, "#FFFFFF", "Distritos", "GeoJSON · polígonos", "22 polígonos", "Límites, código de distrito y área"],
      ["FaFileExcel", C.accent1, "#FFFFFF", "Padrón por barrio", "ZIP con ficheros Excel", "88 ficheros", "Población, superficie, densidad… y mucho más"],
    ];
    const cw = 3.85, ch = 2.2, gx = (W - 2 * M - 3 * cw) / 2;
    for (let i = 0; i < 6; i++) {
      const [ic, col, icCol, t, fmt, n, d] = fuentes[i];
      const x = M + (i % 3) * (cw + gx), y = 1.7 + Math.floor(i / 3) * (ch + 0.25);
      card(s, x, y, cw, ch);
      await hexIcon(s, x + 0.3, y + 0.3, 0.72, col, ic, icCol);
      txt(s, t, { x: x + 1.25, y: y + 0.3, w: cw - 1.45, h: 0.38, fontSize: 18, bold: true, color: C.text2 });
      txt(s, fmt, { x: x + 1.25, y: y + 0.68, w: cw - 1.45, h: 0.3, fontSize: 12, color: C.accent5 });
      txt(s, n, { x: x + 0.3, y: y + 1.12, w: cw - 0.6, h: 0.45, fontSize: 24, bold: true, color: C.text2 });
      txt(s, d, { x: x + 0.3, y: y + 1.57, w: cw - 0.6, h: 0.55, fontSize: 14, color: C.text1 });
    }
    txt(s, "Descarga automática desde geoportal.valencia.es y valencia.es/estadistica, con copia local para no depender de la web.", { x: M, y: 6.55, w: W - 2 * M, h: 0.3, fontSize: 12, color: C.accent5 });
    s.addNotes(
      "Usamos seis conjuntos de datos, todos públicos. Cinco son GeoJSON del geoportal del Ayuntamiento: tres capas de puntos (las paradas de cada red) y dos de polígonos (barrios y distritos). " +
      "El sexto es distinto: un ZIP con 88 ficheros Excel, uno por barrio, con las estadísticas del padrón. El código descarga cada fichero solo si no existe ya en local, así el informe es reproducible sin depender de que la web esté disponible."
    );
  }

  // =========================================================================
  // 7. DATOS CRUDOS
  // =========================================================================
  {
    const s = contenido("02 · DATOS", "Primer vistazo a los datos crudos", "Datos");
    const rows = [
      ["Conjunto", "Filas × col.", "Geometría", "Valores NA"],
      ["Valenbisi", "273 × 12", "Puntos", "0"],
      ["EMT", "1.155 × 9", "Puntos", "114 (codvia, numportal)"],
      ["Metrovalencia (FGV)", "143 × 8", "Puntos", "0"],
      ["Barrios", "88 × 7", "Polígonos", "32 (área)"],
      ["Distritos", "22 × 5", "Polígonos", "15 (área)"],
    ].map((r, i) => r.map((c, j) => ({ text: c, options: i === 0 ? { ...TH, fontSize: 13 } : { ...TD(i), fontSize: 14, bold: j === 0 } })));
    s.addTable(rows, { x: M, y: 1.75, w: 7.0, colW: [2.1, 1.35, 1.25, 2.3], rowH: 0.62, border: tborder, objectName: "tabla-crudos" });
    txt(s, "Coordenadas en WGS 84 (grados) en los cinco conjuntos.", { x: M, y: 5.6, w: 7.0, h: 0.3, fontSize: 12, color: C.accent5 });
    const notas = [
      ["FaClock", C.accent5, "Columnas «en tiempo real»", "Bicis libres, próximas llegadas…: cambian cada pocos minutos y no aportan al análisis espacial."],
      ["FaCircleCheck", C.accent5, "NA de la EMT: irrelevantes", "Están en identificadores de la vía y del portal, que no usamos."],
      ["FaTriangleExclamation", C.accent1, "NA en el área: sí importan", "Faltan en 32 barrios y 15 distritos… pero tenemos la geometría."],
      ["FaClone", C.accent1, "88 barrios, 87 códigos", "Un código de barrio aparece dos veces."],
    ];
    for (let i = 0; i < notas.length; i++) {
      const [ic, col, t, d] = notas[i];
      const y = 1.75 + i * 1.22;
      await hexIcon(s, 8.15, y + 0.05, 0.62, col, ic);
      txt(s, t, { x: 9.05, y, w: W - M - 9.05, h: 0.35, fontSize: 16, bold: true, color: C.text2 });
      txt(s, d, { x: 9.05, y: y + 0.36, w: W - M - 9.05, h: 0.75, fontSize: 14, color: C.text1 });
    }
    s.addNotes(
      "Resumen de cada conjunto tal y como se descarga (función resumen_df del informe: tipo, NA y valores únicos por columna). " +
      "Tres observaciones: (1) muchas columnas son datos en tiempo real que no nos sirven; (2) los NA de la EMT están en codvia y numportal, identificadores que no usamos; (3) los NA del área de barrios y distritos sí son un problema, pero se resuelven recalculando el área con la geometría. " +
      "Además, la tabla de barrios tiene 88 filas pero solo 87 códigos únicos: lo vemos en dos diapositivas."
    );
  }

  // =========================================================================
  // 8. EXCEL NO ESTRUCTURADOS
  // =========================================================================
  {
    const s = contenido("02 · DATOS", "El padrón: 88 Excel sin estructura tabular", "Datos");
    const a = fitImage(s, ASSET("excel_hoja_completa.png"), { x: M, y: 1.65, w: 1.5, h: 4.75 }, { alignX: "left", alignY: "top", alt: "Hoja Padron completa de un Excel de barrio", name: "excel-hoja-completa" });
    const b = fitImage(s, ASSET("excel_zoom.png"), { x: a.x + a.w + 0.3, y: 1.65, w: 5.6, h: 4.85 }, { alignX: "left", alignY: "top", alt: "Detalle de la parte superior de la hoja Padron", name: "excel-zoom" });
    txt(s, "Barrio 1.1 · La Seu. Izquierda: la hoja «Padron» completa. Derecha: su primer tramo.", { x: a.x, y: 6.55, w: b.x + b.w - a.x, h: 0.3, fontSize: 12, color: C.accent5 });
    const facts = [
      ["FaLayerGroup", "7 u 8 hojas por fichero", "Solo nos interesa la hoja «Padron»."],
      ["FaTable", "Unas 333 filas × 14 columnas", "Títulos bilingües, notas y tablas sueltas a distintas alturas."],
      ["FaChartLine", "Gráficos incrustados", "Pirámides de población y sectores entre las tablas."],
      ["FaMagnifyingGlass", "Un único dato necesario", "Las personas de cada barrio (recuadro naranja)."],
    ];
    const fx = b.x + b.w + 0.45;
    for (let i = 0; i < facts.length; i++) {
      const [ic, t, d] = facts[i];
      const y = 1.7 + i * 1.22;
      await hexIcon(s, fx, y + 0.03, 0.6, i === 3 ? C.accent1 : C.text2, ic);
      txt(s, t, { x: fx + 0.85, y, w: W - M - fx - 0.85, h: 0.35, fontSize: 16, bold: true, color: C.text2 });
      txt(s, d, { x: fx + 0.85, y: y + 0.36, w: W - M - fx - 0.85, h: 0.75, fontSize: 14, color: C.text1 });
    }
    s.addNotes(
      "Así es uno de los 88 Excel del padrón (barrio de La Seu). No es una tabla: es un informe pensado para imprimir, con títulos en castellano y valenciano, notas de fuente, tablas de distintos tamaños y gráficos incrustados. " +
      "A la izquierda se ve la hoja entera (unas 333 filas); el recuadro naranja de la tira marca el tramo ampliado a la derecha. De todo esto solo necesitamos un número por barrio: las personas empadronadas, que aparecen en la tabla 1.2 (recuadro naranja)."
    );
  }

  // =========================================================================
  // 9. CÓMO SE LEEN LOS EXCEL
  // =========================================================================
  {
    const s = contenido("02 · DATOS", "Cómo extraemos la población", "Datos");
    txt(s, "Caso habitual · La Seu (87 de 88 ficheros)", { x: M, y: 1.7, w: 6.6, h: 0.35, fontSize: 16, bold: true, color: C.text2 });
    const i1 = fitImage(s, ASSET("excel_seu_12.png"), { x: M, y: 2.1, w: 6.6, h: 1.3 }, { alignX: "left", alignY: "top", alt: "Tabla 1.2 del Excel de La Seu", name: "excel-seu" });
    txt(s, "Caso raro · Port: la tabla sube 4 filas y no hay personas", { x: M, y: i1.y + i1.h + 0.35, w: 6.6, h: 0.35, fontSize: 16, bold: true, color: C.text2 });
    const i2 = fitImage(s, ASSET("excel_port_12.png"), { x: M, y: i1.y + i1.h + 0.75, w: 6.6, h: 1.3 }, { alignX: "left", alignY: "top", alt: "Tabla 1.2 del Excel del Port", name: "excel-port" });
    // leyenda de los recuadros
    const ly = i2.y + i2.h + 0.3;
    s.addShape(S.rect, { x: M, y: ly + 0.06, w: 0.3, h: 0.18, fill: { type: "none" }, line: { color: C.text2, width: 2.5 }, objectName: "ley-cabecera" });
    txt(s, "Cabecera que buscamos", { x: M + 0.42, y: ly, w: 2.6, h: 0.3, fontSize: 13, color: C.text1, valign: "middle" });
    s.addShape(S.rect, { x: M + 3.1, y: ly + 0.06, w: 0.3, h: 0.18, fill: { type: "none" }, line: { color: C.accent1, width: 2.5 }, objectName: "ley-valor" });
    txt(s, "Valor que leemos (personas)", { x: M + 3.52, y: ly, w: 3.0, h: 0.3, fontSize: 13, color: C.text1, valign: "middle" });

    const pasos = [
      ["1", "Buscar la cabecera", "Localizamos «Densidad de población» en toda la hoja, sin suponer una celda fija: está en C17 en 87 ficheros y en C13 en el del Port."],
      ["2", "Leer la celda vecina", "Una fila más abajo y dos columnas a la izquierda está el número de personas del barrio."],
      ["3", "Comprobar", "88 barrios leídos. Solo el Port queda sin población: es el puerto y no tiene vecinos empadronados."],
    ];
    const px = 7.75;
    pasos.forEach(([n, t, d], i) => {
      const y = 1.7 + i * 1.65;
      hexagon(s, px, y, 0.75, i === 2 ? C.accent1 : C.text2, n, { fontSize: 20 });
      txt(s, t, { x: px + 1.1, y: y - 0.02, w: W - M - px - 1.1, h: 0.38, fontSize: 18, bold: true, color: C.text2 });
      txt(s, d, { x: px + 1.1, y: y + 0.38, w: W - M - px - 1.1, h: 1.15, fontSize: 14, color: C.text1 });
    });
    s.addNotes(
      "La estrategia de lectura: en lugar de leer una celda fija (por ejemplo A18), buscamos el texto de la cabecera «Densidad de población» y leemos el valor relativo a ella. " +
      "Esto no es un capricho: en 87 ficheros la cabecera está en C17, pero en el del Port aparece un bloque de «No hay resultados» y la tabla sube a C13. Con una celda fija habríamos leído basura sin darnos cuenta. " +
      "El Port es además el único barrio sin población, lo cual tiene sentido porque es el puerto. Otro detalle: solo existe un Excel para el barrio 17.5, que enlaza con el problema del código duplicado."
    );
  }

  // =========================================================================
  // 10. PROBLEMAS DE CALIDAD
  // =========================================================================
  {
    const s = contenido("02 · DATOS", "Problemas detectados y cómo los resolvimos", "Datos");
    const probs = [
      ["FaGlobe", "Coordenadas en grados (WGS 84)", "Reproyectamos todo a ETRS89 / UTM 30N para medir distancias y áreas en metros."],
      ["FaRulerCombined", "Área vacía en 32 barrios y 15 distritos", "La recalculamos a partir de la geometría de cada polígono, en hectáreas."],
      ["FaClone", "Código de barrio repetido (17.5)", "Mahuella-Tauladella y Rafalell-Vistabella son un solo barrio en dos polígonos: los fusionamos. Solo hay un Excel para el 17.5."],
      ["FaFilter", "Columnas irrelevantes o en tiempo real", "Nos quedamos con identificador, empresa, líneas y geometría."],
    ];
    for (let i = 0; i < probs.length; i++) {
      const [ic, p, sol] = probs[i];
      const y = 1.72 + i * 1.27;
      await hexIcon(s, M, y + 0.04, 0.7, i === 2 ? C.accent1 : C.text2, ic);
      txt(s, p, { x: M + 1.1, y, w: 6.6, h: 0.36, fontSize: 17, bold: true, color: C.text2 });
      txt(s, sol, { x: M + 1.1, y: y + 0.38, w: 6.6, h: 0.8, fontSize: 14, color: C.text1 });
    }
    card(s, 8.55, 1.7, W - M - 8.55, 5.1, C.background2, "marco-mapa");
    fitImage(s, FIG("extra_barrio_duplicado.png"), { x: 8.75, y: 1.85, w: W - M - 8.95, h: 4.3 }, { alt: "Mapa del barrio 17.5 dividido en dos polígonos", name: "mapa-17-5" });
    txt(s, "Norte de València: el barrio 17.5 son dos polígonos separados.", { x: 8.8, y: 6.2, w: W - M - 9.0, h: 0.5, fontSize: 12, color: C.accent5 });
    s.addNotes(
      "Cuatro problemas y su solución. (1) Las coordenadas venían en grados; para calcular distancias en metros reproyectamos a ETRS89 / UTM 30N (EPSG:25830), el sistema oficial para la Comunidad Valenciana. " +
      "(2) El área faltaba en muchos polígonos, pero se puede calcular directamente de la geometría. (3) El código 17.5 aparece dos veces porque el barrio está partido en dos polígonos separados (mapa de la derecha); los unimos en una sola fila y el hecho de que solo haya un Excel para el 17.5 confirma que es un único barrio. " +
      "(4) Eliminamos las columnas que no aportan al análisis espacial."
    );
  }

  // =========================================================================
  // 11. TABLAS TIDY
  // =========================================================================
  {
    const s = contenido("02 · DATOS", "Resultado: dos tablas tidy", "Datos");
    // Transporte
    const tr = csv("head_transporte.csv");
    txt(s, "Transporte · 1.571 filas", { x: M, y: 1.65, w: 5.9, h: 0.38, fontSize: 18, bold: true, color: C.text2 });
    txt(s, "Una fila por parada; las líneas se guardan como lista.", { x: M, y: 2.03, w: 5.9, h: 0.3, fontSize: 14, color: C.accent5 });
    const t1 = [["gid", "empresa", "líneas", "geometría (m)"].map((h) => ({ text: h, options: TH }))]
      .concat(tr.map((r, i) => [r.gid, r.empresa, r.lineas, r.geometria].map((c) => ({ text: c, options: { ...TD(i + 1), fontFace: "Courier New", fontSize: 12 } }))));
    s.addTable(t1, { x: M, y: 2.5, w: 5.9, colW: [1.05, 1.25, 0.75, 2.85], rowH: 0.4, border: tborder, objectName: "tabla-transporte" });
    // Población
    const pb = csv("head_pob.csv");
    const x2 = 6.85;
    txt(s, "Población · 87 barrios", { x: x2, y: 1.65, w: W - M - x2, h: 0.38, fontSize: 18, bold: true, color: C.text2 });
    txt(s, "Une la geometría (GeoJSON) con el padrón (Excel).", { x: x2, y: 2.03, w: W - M - x2, h: 0.3, fontSize: 14, color: C.accent5 });
    const t2 = [["id", "nombre", "personas", "sup. (ha)", "hab/ha"].map((h) => ({ text: h, options: TH }))]
      .concat(pb.map((r, i) => [r.id, r.nombre, num(r.personas), dec(r.superficie, 1), dec(r.densidad, 1)].map((c, j) => ({ text: c, options: { ...TD(i + 1), fontFace: "Courier New", fontSize: 12, align: j >= 2 ? "right" : "left" } }))));
    s.addTable(t2, { x: x2, y: 2.5, w: W - M - x2, colW: [0.55, 2.0, 1.15, 1.1, 1.083], rowH: 0.4, border: tborder, objectName: "tabla-poblacion" });
    // Flujo
    const fy = 5.85;
    const chips = [["5 GeoJSON + 88 Excel", C.background2, C.text2], ["Limpieza y reproyección", C.background2, C.text2], ["2 tablas tidy con geometría", C.accent1, C.background1]];
    const cw = 3.4, gap = (W - 2 * M - 3 * cw) / 2;
    chips.forEach(([t, f, tc], i) => {
      const x = M + i * (cw + gap);
      s.addText(t, { shape: S.roundRect, x, y: fy, w: cw, h: 0.62, rectRadius: 0.31, fill: { color: f }, line: { type: "none" }, align: "center", valign: "middle", fontSize: 15, bold: true, color: tc, margin: 0, objectName: `flujo-${i}` });
      if (i < 2) txt(s, "→", { x: x + cw, y: fy, w: gap, h: 0.62, fontSize: 26, bold: true, color: C.accent1, align: "center", valign: "middle" });
    });
    s.addNotes(
      "El resultado de la limpieza son dos tablas tidy (una observación por fila, una variable por columna). " +
      "La de transporte junta las tres redes en una sola tabla con 1.571 paradas: identificador, empresa, lista de líneas y la geometría ya en metros. Se muestran dos filas de cada empresa. " +
      "La de población tiene una fila por barrio (87 tras fusionar el 17.5) con su nombre, personas, superficie recalculada y densidad. Sobre estas dos tablas se construye todo el análisis."
    );
  }

  // =========================================================================
  // 12. DIVISOR · EXPLORACIÓN
  // =========================================================================
  pres.addSection({ title: "Exploración" });
  (await divisor("03", "Exploración inicial", "¿Hasta dónde llega cada red?", "Exploración", "FaMapLocationDot")).addNotes(
    "Antes de responder a las preguntas, miramos dónde está cada red sobre el mapa. Esto nos obliga a acotar la zona de estudio."
  );

  // =========================================================================
  // 13. ALCANCE DE LAS REDES
  // =========================================================================
  {
    const s = contenido("03 · EXPLORACIÓN", "Tres redes con alcances muy distintos", "Exploración");
    fitImage(s, FIG("fig1_redes_completas.png"), { x: M, y: 1.55, w: 6.9, h: 5.3 }, { alignX: "left", alt: "Mapas de paradas de EMT, FGV y Valenbisi en todo el término municipal", name: "fig-redes" });
    const it = [
      ["FaBus", C.accent3, "#FFFFFF", "EMT", "Cubre casi toda la ciudad, incluidas la playa y las pedanías del sur."],
      ["FaTrainSubway", C.accent4, "#0F2C3F", "Metrovalencia (FGV)", "La red más extensa: sale de la ciudad y la conecta con municipios vecinos."],
      ["FaBicycle", C.accent2, "#FFFFFF", "Valenbisi", "Muy densa, pero solo en el núcleo urbano."],
    ];
    const x = 7.9;
    for (let i = 0; i < 3; i++) {
      const [ic, col, icc, t, d] = it[i];
      const y = 1.75 + i * 1.35;
      await hexIcon(s, x, y, 0.72, col, ic, icc);
      txt(s, t, { x: x + 1.05, y, w: W - M - x - 1.05, h: 0.36, fontSize: 18, bold: true, color: C.text2 });
      txt(s, d, { x: x + 1.05, y: y + 0.38, w: W - M - x - 1.05, h: 0.85, fontSize: 15, color: C.text1 });
    }
    card(s, x, 5.9, W - M - x, 0.85, C.background2, "conclusion");
    txt(s, "Valenbisi marca el área de estudio: no tiene sentido buscar sus «desiertos» fuera de donde opera.", { x: x + 0.25, y: 5.95, w: W - M - x - 0.5, h: 0.75, fontSize: 14, bold: true, color: C.text2, valign: "middle" });
    s.addNotes(
      "Cada punto es una parada sobre los límites de los barrios. La EMT llega a casi todo el término municipal, incluida la franja sur de la costa. Metrovalencia es la red más extensa porque sale de la ciudad hacia el área metropolitana. " +
      "Valenbisi, en cambio, está muy concentrada en el núcleo urbano. Por eso centramos el estudio en los barrios donde Valenbisi está presente."
    );
  }

  // =========================================================================
  // 14. ZONA DE ESTUDIO
  // =========================================================================
  {
    const s = contenido("03 · EXPLORACIÓN", "Zona de estudio: barrios con Valenbisi", "Exploración");
    const f = fitImage(s, FIG("fig2_zona_estudio.png"), { x: M, y: 1.5, w: W - 2 * M, h: 3.85 }, { alt: "Mapas de las tres redes recortados a la zona de estudio", name: "fig-zona" });
    txt(s, "En gris, barrios sin ninguna estación de Valenbisi (se excluyen). La línea discontinua marca un margen de 1 km alrededor de la zona.", { x: M, y: f.y + f.h + 0.05, w: W - 2 * M, h: 0.3, fontSize: 12, color: C.accent5 });
    const stats = [
      [`${P1.n_barrios_estudio} de ${P1.n_barrios_total}`, "barrios con al menos una estación"],
      ["96 %", "de la población (809.040 hab.)"],
      ["55,5 km²", "de superficie de estudio"],
      ["+ El Pilar", "céntrico y sin estación: se mantiene como referencia"],
    ];
    const sw = (W - 2 * M - 3 * 0.3) / 4;
    stats.forEach(([n, l], i) => {
      const x = M + i * (sw + 0.3), y = 5.75;
      card(s, x, y, sw, 1.05, C.background2, `stat-${i}`);
      txt(s, n, { x: x + 0.2, y: y + 0.08, w: sw - 0.4, h: 0.5, fontSize: 26, bold: true, color: i === 3 ? C.accent1 : C.text2, valign: "middle" });
      txt(s, l, { x: x + 0.2, y: y + 0.58, w: sw - 0.4, h: 0.42, fontSize: 12, color: C.text1 });
    });
    s.addNotes(
      "Nos quedamos con los 71 barrios que tienen al menos una estación de Valenbisi: en gris los que se descartan. Aunque son 71 de 87 barrios, concentran el 96 % de la población (809.040 de 844.424 habitantes), así que perdemos muy poca gente. " +
      "El Pilar es un barrio céntrico y pequeño sin estación propia: lo conservamos en la tabla de población porque, al estar en pleno centro, interesa para otros análisis. La línea discontinua es solo un margen de 1 km para encuadrar los mapas."
    );
  }

  // =========================================================================
  // 15. DIVISOR · P1
  // =========================================================================
  pres.addSection({ title: "P1 · Población y transporte" });
  (await divisor("04", "P1 · Población y transporte", "¿Tienen más oferta los barrios más poblados?", "P1 · Población y transporte", "FaPeopleGroup")).addNotes(
    "Primera pregunta: si la oferta de transporte acompaña a la población de cada barrio."
  );

  // =========================================================================
  // 16. MAPAS P1
  // =========================================================================
  {
    const s = contenido("04 · P1", "Población y paradas, barrio a barrio", "P1 · Población y transporte");
    const f = fitImage(s, FIG("fig3_p1_mapas.png"), { x: M, y: 1.55, w: W - 2 * M, h: 3.45 }, { alt: "Cuatro mapas: población, paradas de EMT, de Metrovalencia y estaciones de Valenbisi por barrio", name: "fig-p1-mapas" });
    const tk = [
      ["Los barrios más poblados están en la periferia: Benicalap lidera con 44.570 hab."],
      ["EMT: el máximo está en La Punta (44 paradas), un barrio muy extenso del sur."],
      ["Metro: como mucho 8 paradas por barrio (Cabanyal-Canyamelar)."],
      ["Valenbisi: máximo en La Carrasca (13 estaciones), junto a los campus."],
    ];
    const cw = (W - 2 * M - 3 * 0.25) / 4;
    tk.forEach(([t], i) => {
      const x = M + i * (cw + 0.25), y = f.y + f.h + 0.25;
      card(s, x, y, cw, 1.45, C.background2, `dato-${i}`);
      txt(s, t, { x: x + 0.2, y: y + 0.15, w: cw - 0.4, h: 1.15, fontSize: 14, color: C.text1, valign: "middle" });
    });
    s.addNotes(
      "Cuatro mapas con la misma división en barrios: población, paradas de EMT, de Metrovalencia y estaciones de Valenbisi. El hueco blanco del centro en los mapas de transporte es El Pilar, que no forma parte de la zona con Valenbisi. " +
      "A simple vista los patrones no coinciden del todo: los barrios más poblados están en el anillo exterior (Benicalap es el máximo), mientras que el máximo de paradas de EMT está en La Punta, un barrio enorme pero poco poblado. Para el metro hay pocas estaciones por barrio, como mucho 8."
    );
  }

  // =========================================================================
  // 17. TOTAL Y RATIO
  // =========================================================================
  {
    const s = contenido("04 · P1", "Oferta total y oferta por habitante", "P1 · Población y transporte");
    fitImage(s, FIG("fig4_p1_total_ratio.png"), { x: M, y: 1.6, w: 8.3, h: 5.2 }, { alignX: "left", alt: "Mapas de puntos de transporte totales y por cada 1000 habitantes", name: "fig-p1-ratio" });
    const x = 9.3, w = W - M - x;
    card(s, x, 1.75, w, 2.35, C.text2, "stat-correlacion");
    txt(s, dec(P1.correlacion), { x: x + 0.3, y: 1.9, w: w - 0.6, h: 1.1, fontSize: 66, bold: true, color: C.accent1, valign: "middle" });
    txt(s, "correlación entre habitantes y puntos de transporte del barrio", { x: x + 0.3, y: 3.05, w: w - 0.6, h: 0.9, fontSize: 14, color: C.background1 });
    txt(s, bullets([
      "Los barrios más poblados tienden a tener más paradas.",
      "Pero por habitante destacan barrios extensos y poco poblados: La Punta (11,3 por cada 1.000 hab.) y La Carrasca (9,9).",
    ], { space: 10 }), { x, y: 4.35, w, h: 2.4, fontSize: 15, color: C.text1 });
    s.addNotes(
      "Sumamos las tres redes en un indicador de «puntos de transporte» por barrio (izquierda) y lo dividimos entre su población (derecha, por cada 1.000 habitantes). " +
      "La correlación entre habitantes y puntos de transporte es 0,64: positiva y moderada-alta. Pero el mapa por habitante cuenta otra historia: los valores más altos están en La Punta y La Carrasca, barrios con mucha superficie (huerta, campus) y pocos vecinos."
    );
  }

  // =========================================================================
  // 18. DISPERSIÓN (figura nueva)
  // =========================================================================
  {
    const s = contenido("04 · P1", "Más habitantes, más transporte… con excepciones", "P1 · Población y transporte");
    fitImage(s, FIG("extra_dispersion_p1.png"), { x: M, y: 1.55, w: 7.3, h: 5.3 }, { alignX: "left", alt: "Dispersión de habitantes frente a puntos de transporte por barrio con recta de regresión", name: "fig-dispersion" });
    const x = 8.35, w = W - M - x;
    [[`r = ${dec(P1.correlacion)}`, 0], [`R² = ${dec(P1.r2)}`, 1]].forEach(([t, i]) => {
      s.addText(t, { shape: S.roundRect, x: x + i * 1.7, y: 1.75, w: 1.55, h: 0.55, rectRadius: 0.27, fill: { color: C.background2 }, line: { type: "none" }, align: "center", valign: "middle", fontSize: 15, bold: true, color: C.text2, margin: 0, objectName: `chip-${i}` });
    });
    txt(s, `Cada 10.000 habitantes más ≈ ${dec(P1.pendiente_por_10000, 0)} puntos de transporte más.`, { x, y: 2.45, w, h: 0.6, fontSize: 14, color: C.accent5 });
    txt(s, "Por encima de la recta", { x, y: 3.3, w, h: 0.36, fontSize: 17, bold: true, color: C.accent1 });
    txt(s, "La Punta, La Carrasca, Campanar y Cabanyal-Canyamelar: barrios extensos, con campus o frente marítimo.", { x, y: 3.68, w, h: 1.0, fontSize: 15, color: C.text1 });
    txt(s, "Por debajo de la recta", { x, y: 4.85, w, h: 0.36, fontSize: 17, bold: true, color: C.text2 });
    txt(s, "Aiora, L'Hort de Senabre y Sant Antoni: mucha población y relativamente poca oferta.", { x, y: 5.23, w, h: 1.0, fontSize: 15, color: C.text1 });
    txt(s, "Figura nueva respecto al informe.", { x, y: 6.45, w, h: 0.3, fontSize: 12, italic: true, color: C.accent5 });
    s.addNotes(
      "Esta figura no está en el informe; la añadimos para visualizar la correlación. Cada punto es un barrio; la recta es una regresión lineal simple. " +
      "La población explica alrededor del 41 % de la variabilidad (R² = 0,41): por cada 10.000 habitantes más, un barrio tiene unos 10 puntos de transporte más. " +
      "Respuesta a P1: sí existe relación, pero no es uniforme. Los barrios por encima de la recta son extensos o tienen grandes equipamientos; los de abajo (Aiora, L'Hort de Senabre, Sant Antoni) son densos y relativamente peor servidos."
    );
  }

  // =========================================================================
  // 19. DIVISOR · P2
  // =========================================================================
  pres.addSection({ title: "P2 · Desiertos de Valenbisi" });
  (await divisor("05", "P2 · Desiertos de Valenbisi", "¿Dónde no hay una estación cerca? ¿La compensan EMT y Metrovalencia?", "P2 · Desiertos de Valenbisi", "FaBicycle")).addNotes(
    "Segunda pregunta. Hemos visto que el transporte no se reparte de forma homogénea; ahora buscamos zonas concretas sin estación de Valenbisi cercana."
  );

  // =========================================================================
  // 20. MÉTODO
  // =========================================================================
  {
    const s = contenido("05 · P2", "¿Cómo medimos un desierto?", "P2 · Desiertos de Valenbisi");
    const pasos = [
      ["1", "Rejilla hexagonal", `Cubrimos la zona de estudio con ${num(P2.n_hex)} hexágonos de 50 m (unas 0,22 ha cada uno).`],
      ["2", "Distancia a cada red", "Desde el centro de cada hexágono medimos la distancia a la parada más cercana de Valenbisi, EMT y FGV."],
      ["3", "Umbral de 250 m", "Sin Valenbisi a ≤ 250 m, el hexágono es un desierto. Según EMT y FGV, puede estar compensado por los dos, por uno o por ninguno."],
    ];
    pasos.forEach(([n, t, d], i) => {
      const y = 1.75 + i * 1.6;
      hexagon(s, M, y, 0.85, i === 2 ? C.accent1 : C.text2, n, { fontSize: 22 });
      txt(s, t, { x: M + 1.3, y: y - 0.02, w: 6.0, h: 0.4, fontSize: 19, bold: true, color: C.text2 });
      txt(s, d, { x: M + 1.3, y: y + 0.42, w: 6.0, h: 1.0, fontSize: 15, color: C.text1 });
    });
    card(s, 8.05, 1.6, W - M - 8.05, 5.2, C.background2, "marco-zoom");
    fitImage(s, FIG("extra_metodo_zoom.png"), { x: 8.2, y: 1.7, w: W - M - 8.35, h: 4.6 }, { alt: "Detalle de la rejilla hexagonal con paradas y radios de 250 m alrededor de Natzaret", name: "fig-metodo" });
    txt(s, "Detalle en Natzaret · círculos: 250 m alrededor de cada Valenbisi. Figura nueva.", { x: 8.25, y: 6.38, w: W - M - 8.45, h: 0.35, fontSize: 11, color: C.accent5 });
    s.addNotes(
      "Para buscar desiertos no basta con contar estaciones por barrio, porque un barrio grande puede tener estaciones solo en una esquina. Por eso dividimos la zona en una rejilla de hexágonos de 50 m; usamos hexágonos porque todos sus vecinos están a la misma distancia y cubren el plano sin huecos. " +
      "Para cada hexágono medimos la distancia desde su centro a la parada más cercana de cada red. Si no hay Valenbisi a 250 m o menos, es un desierto; y miramos si EMT o FGV sí están a menos de 250 m para ver si lo compensan. " +
      "La figura de la derecha (nueva) es un zoom en Natzaret: los círculos azules son los 250 m alrededor de cada estación de Valenbisi."
    );
  }

  // =========================================================================
  // 21. UMBRAL 250 m
  // =========================================================================
  {
    const s = contenido("05 · P2", "¿Por qué 250 metros?", "P2 · Desiertos de Valenbisi");
    const f = fitImage(s, FIG("fig5_distancias.png"), { x: M, y: 1.5, w: W - 2 * M, h: 4.25 }, { alt: "Densidad y distribución acumulada de la distancia de cada parada de EMT y FGV al Valenbisi más cercano", name: "fig-distancias" });
    const stats = [
      [pct(DIST.emt_250), "de las paradas de EMT de la zona tienen un Valenbisi a ≤ 250 m"],
      [pct(DIST.fgv_250), "de las estaciones de FGV de la zona, también"],
      ["≈ 3 min", "a pie: 250 m es una distancia razonable para llegar a una estación"],
    ];
    const sw = (W - 2 * M - 2 * 0.3) / 3;
    stats.forEach(([n, l], i) => {
      const x = M + i * (sw + 0.3), y = 5.95;
      txt(s, n, { x, y, w: 1.6, h: 0.8, fontSize: 30, bold: true, color: i === 2 ? C.text2 : C.accent1, valign: "middle" });
      txt(s, l, { x: x + 1.65, y, w: sw - 1.65, h: 0.8, fontSize: 13, color: C.text1, valign: "middle" });
    });
    s.addNotes(
      "¿Por qué 250 m y no otro valor? Lo calibramos con los propios datos: para cada parada de EMT y FGV dentro de la zona de estudio calculamos la distancia a la estación de Valenbisi más cercana. " +
      `La mediana es de ${DIST.emt_med} m para la EMT y ${DIST.fgv_med} m para FGV, y la curva acumulada tiene un codo en torno a 250 m: a partir de ahí casi no se añaden paradas. ` +
      "Es decir, en la zona donde opera Valenbisi, lo normal es tener una estación a menos de 250 m de cualquier parada (unos 3 minutos a pie). En el anexo hay un análisis de sensibilidad con otros umbrales."
    );
  }

  // =========================================================================
  // 22. MAPA DE DESIERTOS
  // =========================================================================
  {
    const s = contenido("05 · P2", "Mapa de desiertos de Valenbisi", "P2 · Desiertos de Valenbisi");
    fitImage(s, FIG("fig6_desiertos.png"), { x: M, y: 1.5, w: 8.75, h: 5.35 }, { alignX: "left", alt: "Mapa hexagonal de cobertura de Valenbisi y desiertos compensados o no por EMT y FGV", name: "fig-desiertos" });
    const x = 9.7, w = W - M - x;
    const stats = [
      [pct(1 - Number(P2.cob_V)), "de la zona de estudio no tiene Valenbisi a ≤ 250 m", C.accent1],
      [pct(0.243), "no tiene ningún modo cerca: desierto sin compensación", C.accent6],
      [pct(P2.peso9), "del área en desierto se concentra en solo 9 barrios", C.text2],
    ];
    stats.forEach(([n, l, col], i) => {
      const y = 1.75 + i * 1.7;
      txt(s, n, { x, y, w, h: 0.75, fontSize: 44, bold: true, color: col, valign: "middle" });
      txt(s, l, { x, y: y + 0.75, w, h: 0.7, fontSize: 14, color: C.text1 });
    });
    s.addNotes(
      "Este es el resultado principal. En gris, la parte de la zona de estudio con una estación de Valenbisi a 250 m o menos; en rojo, los desiertos, más oscuros cuanto menos compensados están. " +
      `Un ${pct(1 - Number(P2.cob_V))} de la superficie no tiene Valenbisi cerca, y un 24 % no tiene ni Valenbisi, ni EMT, ni metro a menos de 250 m. ` +
      "Los desiertos no están repartidos: se concentran en el borde de la ciudad (Benimamet y Sant Pau al oeste, La Punta y el puerto al sur) y en 9 barrios se acumula el 85 % del área en desierto. Dentro del núcleo urbano solo aparecen pequeños huecos."
    );
  }

  // =========================================================================
  // 23. ¿COMPENSAN?
  // =========================================================================
  {
    const s = contenido("05 · P2", "¿Compensan EMT y Metrovalencia los desiertos?", "P2 · Desiertos de Valenbisi");
    txt(s, "Superficie con parada a ≤ 250 m", { x: M, y: 1.65, w: 6.3, h: 0.35, fontSize: 15, bold: true, color: C.accent5 });
    const grupos = [
      ["Donde SÍ hay Valenbisi cerca", [["EMT", P2.cubierto_EMT, C.accent3], ["FGV", P2.cubierto_FGV, C.accent4]]],
      ["En los desiertos de Valenbisi", [["EMT", P2.desierto_EMT, C.accent3], ["FGV", P2.desierto_FGV, C.accent4]]],
    ];
    const bx = M + 0.85, bw = 4.4;
    grupos.forEach(([t, bars], g) => {
      const y0 = 2.2 + g * 1.85;
      txt(s, t, { x: M, y: y0, w: 6.3, h: 0.38, fontSize: 18, bold: true, color: C.text2 });
      bars.forEach(([lab, v, col], j) => {
        const y = y0 + 0.5 + j * 0.58;
        txt(s, lab, { x: M, y, w: 0.8, h: 0.42, fontSize: 14, bold: true, color: C.text1, valign: "middle" });
        s.addShape(S.rect, { x: bx, y: y + 0.04, w: bw, h: 0.34, fill: { color: C.background2 }, line: { type: "none" }, objectName: `pista-${g}-${j}` });
        s.addShape(S.rect, { x: bx, y: y + 0.04, w: Math.max(0.04, bw * Number(v)), h: 0.34, fill: { color: col }, line: { type: "none" }, objectName: `barra-${g}-${j}` });
        txt(s, pct(v), { x: bx + bw + 0.12, y, w: 0.85, h: 0.42, fontSize: 16, bold: true, color: C.text2, valign: "middle" });
      });
    });
    card(s, M, 5.85, 6.3, 0.95, C.text2, "conclusion-p2");
    txt(s, "Las tres redes se concentran en las mismas zonas: donde falta Valenbisi, también suelen faltar autobús y metro.", { x: M + 0.25, y: 5.9, w: 5.8, h: 0.85, fontSize: 14, bold: true, color: C.background1, valign: "middle" });
    txt(s, "Los 9 barrios con más superficie en desierto", { x: 7.35, y: 1.65, w: W - M - 7.35, h: 0.35, fontSize: 15, bold: true, color: C.accent5 });
    fitImage(s, FIG("extra_top9_desiertos.png"), { x: 7.35, y: 2.05, w: W - M - 7.35, h: 4.4 }, { alt: "Barras de superficie en desierto por barrio y tipo de compensación", name: "fig-top9" });
    txt(s, "Figura nueva respecto al informe.", { x: 7.35, y: 6.5, w: W - M - 7.35, h: 0.3, fontSize: 12, italic: true, color: C.accent5 });
    s.addNotes(
      "Comparamos la cobertura de EMT y FGV dentro y fuera de los desiertos. Donde hay Valenbisi cerca, la EMT cubre el 95 % de la superficie y FGV el 29 %. En los desiertos, la EMT baja al 36 % y FGV al 4 %. " +
      "Conclusión: los modos no se complementan, sino que se concentran en las mismas zonas. La EMT compensa una parte de los desiertos; el metro casi nada. " +
      "A la derecha (figura nueva), los 9 barrios con más superficie en desierto. Ojo: La Punta y El Grau son en gran parte huerta y puerto, con poca población; esto lo retomamos en las limitaciones."
    );
  }

  // =========================================================================
  // 24. CONCLUSIONES
  // =========================================================================
  pres.addSection({ title: "Conclusiones" });
  {
    const s = contenido("06 · CONCLUSIONES", "Conclusiones", "Conclusiones");
    const cols = [
      ["P1", "Población y transporte", "Sí hay relación: los barrios más poblados tienen más paradas (r = 0,64). Pero no es uniforme: barrios extensos como La Punta están sobredotados por habitante y otros densos, como Aiora, quedan por debajo."],
      ["P2", "Desiertos de Valenbisi", "Sí existen: el 39 % de la zona de estudio no tiene una estación a ≤ 250 m. Están en la periferia y el puerto, y EMT y metro solo los compensan en parte (36 % y 4 %)."],
      ["FaDatabase", "Plano técnico", "Integramos seis fuentes abiertas, incluidos 88 Excel no estructurados, en dos tablas tidy, y trabajamos con geometrías y distancias en metros."],
    ];
    const cw = (W - 2 * M - 2 * 0.35) / 3;
    for (let i = 0; i < 3; i++) {
      const [k, t, d] = cols[i];
      const x = M + i * (cw + 0.35), y = 1.75;
      card(s, x, y, cw, 4.95, i < 2 ? C.background2 : C.background2, `conclusion-${i}`);
      if (k.startsWith("Fa")) await hexIcon(s, x + 0.35, y + 0.35, 0.9, C.text2, k);
      else hexagon(s, x + 0.35, y + 0.35, 0.9, C.accent1, k, { fontSize: 22 });
      txt(s, t, { x: x + 0.35, y: y + 1.45, w: cw - 0.7, h: 0.42, fontSize: 20, bold: true, color: C.text2 });
      txt(s, d, { x: x + 0.35, y: y + 1.95, w: cw - 0.7, h: 2.8, fontSize: 15, color: C.text1 });
    }
    s.addNotes(
      "Resumen de respuestas. P1: hay relación entre población y oferta, pero con excepciones claras en ambos sentidos. P2: sí hay desiertos de Valenbisi, concentrados en el borde de la ciudad, y los otros modos solo los compensan parcialmente porque tienden a estar en las mismas zonas. " +
      "Y en el plano técnico, el trabajo nos ha obligado a resolver problemas reales de datos: ficheros no tabulares, valores faltantes, códigos duplicados y sistemas de coordenadas."
    );
  }

  // =========================================================================
  // 25. LIMITACIONES
  // =========================================================================
  {
    const s = contenido("06 · CONCLUSIONES", "Limitaciones y próximos pasos", "Conclusiones");
    const lim = [
      ["FaRoute", "Distancias en línea recta, no por la red de calles."],
      ["FaBus", "Contamos paradas, no oferta real: frecuencias, líneas o anclajes por estación."],
      ["FaPeopleGroup", "Puerto y huerta cuentan como desierto aunque apenas tengan vecinos."],
      ["FaRulerCombined", "Un único umbral (250 m) para los tres modos."],
    ];
    const nxt = [
      ["FaPersonWalking", "Isócronas a pie sobre la red viaria."],
      ["FaUsers", "Ponderar la cobertura por población (secciones censales)."],
      ["FaClock", "Incorporar frecuencias de la EMT y la disponibilidad real de bicis."],
      ["FaBicycle", "Añadir el carril bici y los aparcamientos de bici privada."],
    ];
    const colW = (W - 2 * M - 0.5) / 2;
    const blocks = [["Limitaciones", lim, C.text2], ["Próximos pasos", nxt, C.accent1]];
    for (let b = 0; b < 2; b++) {
      const [t, items, col] = blocks[b];
      const x = M + b * (colW + 0.5);
      txt(s, t, { x, y: 1.7, w: colW, h: 0.45, fontSize: 22, bold: true, color: col });
      for (let i = 0; i < items.length; i++) {
        const y = 2.4 + i * 1.1;
        await hexIcon(s, x, y, 0.65, col, items[i][0]);
        txt(s, items[i][1], { x: x + 1.0, y, w: colW - 1.0, h: 0.75, fontSize: 16, color: C.text1, valign: "middle" });
      }
    }
    s.addNotes(
      "Somos conscientes de varias simplificaciones. Medimos distancias en línea recta, cuando lo que importa es lo que se camina por la calle. Contamos paradas, no la oferta real (una parada con 10 líneas no equivale a una con 1). " +
      "Además, los desiertos más grandes son zonas con poca o ninguna población (puerto, huerta de La Punta), así que pesan mucho en superficie pero poco en personas. " +
      "Como trabajo futuro: isócronas sobre la red viaria, ponderar por población a nivel de sección censal, añadir frecuencias y disponibilidad, e incorporar el carril bici y los aparcamientos de bici privada."
    );
  }

  // =========================================================================
  // 26. GRACIAS
  // =========================================================================
  {
    const s = pres.addSlide({ masterName: "PORTADA", sectionTitle: "Conclusiones" });
    s.addText([{ text: "¡Gracias!", options: { breakLine: true } }, { text: "¿Preguntas?", options: { color: C.accent1 } }], { placeholder: "title" });
    s.addText("Turno de preguntas del público", { placeholder: "subtitulo" });
    txt(s, [{ text: "Sara Marquínez Díaz · Ángel Lapeña López", options: { breakLine: true } }, { text: "Javier Rodríguez Jiménez" }], { x: 0.7, y: 5.25, w: 5.9, h: 0.7, fontSize: 14, color: C.background1 });
    txt(s, "Datos: opendata.vlci.valencia.es · valencia.es/estadistica", { x: 0.7, y: 6.2, w: 5.9, h: 0.3, fontSize: 12, color: C.background2 });
    fitImage(s, FIG("portada_hex.png"), { x: 6.85, y: 0.9, w: 6.0, h: 5.7 }, { alt: "Mapa hexagonal de cobertura de Valenbisi", name: "mapa-cierre" });
    s.addNotes("Cierre. Al final hay diapositivas de anexo para apoyar las preguntas más probables: sensibilidad del umbral, ranking de barrios por oferta por habitante y columnas de los datos crudos.");
  }

  // =========================================================================
  // ANEXO
  // =========================================================================
  pres.addSection({ title: "Anexo" });
  (await divisor("A", "Anexo", "Diapositivas de apoyo para las preguntas", "Anexo", "FaListCheck")).addNotes("Material de apoyo; no se presenta salvo que surja la pregunta.");

  // A1. Sensibilidad
  {
    const s = contenido("ANEXO", "Sensibilidad del umbral de distancia", "Anexo");
    fitImage(s, FIG("anexo_sensibilidad_umbral.png"), { x: M, y: 1.55, w: 7.4, h: 5.2 }, { alignX: "left", alt: "Cobertura de cada red según el umbral de distancia", name: "fig-sensibilidad" });
    const sens = csv("sensibilidad.csv");
    const rows = [["Umbral", "Valenbisi", "EMT", "FGV"].map((h) => ({ text: h, options: { ...TH, align: "center" } }))]
      .concat(sens.map((r, i) => [`${r.umbral} m`, pct(r.Valenbisi), pct(r.EMT), pct(r.FGV)].map((c, j) => ({ text: c, options: { ...TD(i + 1), fontSize: 14, align: j ? "right" : "left", bold: r.umbral === "250" } }))));
    const x = 8.45, w = W - M - x;
    s.addTable(rows, { x, y: 1.75, w, colW: [1.05, 1.1, 0.95, w - 3.1], rowH: 0.48, border: tborder, objectName: "tabla-sensibilidad" });
    txt(s, "Superficie de la zona de estudio cubierta por cada red según el umbral. Entre 200 y 300 m, Valenbisi pasa del 50 % al 66 %: la conclusión cualitativa no cambia.", { x, y: 4.85, w, h: 1.5, fontSize: 14, color: C.text1 });
    s.addNotes("Si nos preguntan por el umbral: con 200 m la cobertura de Valenbisi sería del 50 % y con 300 m del 66 %. Los desiertos siguen apareciendo en las mismas zonas; solo cambia su extensión. La franja gris del gráfico marca los 250 m elegidos.");
  }

  // A2. Ranking por habitante
  {
    const s = contenido("ANEXO", "Oferta de transporte por cada 1.000 habitantes", "Anexo");
    const rk = csv("ranking_p1.csv");
    const mk = (list, start) => [["Barrio", "Hab.", "EMT", "Metro", "Vb.", "/1.000"].map((h, j) => ({ text: h, options: { ...TH, align: j ? "right" : "left" } }))]
      .concat(list.map((r, i) => [r.nombre, num(r.personas), r.n_emt, r.n_metro, r.n_valenbisi, dec(r.por_mil, 1)].map((c, j) => ({ text: c, options: { ...TD(i + 1), align: j ? "right" : "left" } }))));
    const tw = (W - 2 * M - 0.5) / 2;
    const colW = [2.15, 0.9, 0.6, 0.75, 0.55, tw - 4.95];
    txt(s, "Más oferta por habitante", { x: M, y: 1.6, w: tw, h: 0.38, fontSize: 18, bold: true, color: C.accent1 });
    s.addTable(mk(rk.slice(0, 8)), { x: M, y: 2.05, w: tw, colW, rowH: 0.42, border: tborder, objectName: "tabla-top" });
    txt(s, "Menos oferta por habitante", { x: M + tw + 0.5, y: 1.6, w: tw, h: 0.38, fontSize: 18, bold: true, color: C.text2 });
    s.addTable(mk(rk.slice(-8).reverse()), { x: M + tw + 0.5, y: 2.05, w: tw, colW, rowH: 0.42, border: tborder, objectName: "tabla-bottom" });
    txt(s, "Puntos de transporte = paradas de EMT + estaciones de Metrovalencia + estaciones de Valenbisi del barrio. 70 barrios con población (sin el Port).", { x: M, y: 6.0, w: W - 2 * M, h: 0.5, fontSize: 12, color: C.accent5 });
    s.addNotes("Tabla de apoyo para P1: los extremos del indicador de puntos de transporte por cada 1.000 habitantes.");
  }

  // A3. Columnas crudas
  {
    const s = contenido("ANEXO", "Columnas de los datos crudos", "Anexo");
    const rs = csv("resumen_crudos.csv");
    const nombre = { Valenbisi: "Valenbisi", EMT: "EMT", FGV: "Metrovalencia (FGV)", Barrios: "Barrios", Distritos: "Distritos" };
    const usadas = { Valenbisi: "gid, number", EMT: "gid, lineas", FGV: "gid, linea", Barrios: "coddistbar, codbarrio, coddistrit, nombre", Distritos: "No se usan en el análisis final" };
    const rows = [["Conjunto", "Columnas originales (además de la geometría)", "Usadas"].map((h) => ({ text: h, options: TH }))]
      .concat(rs.map((r, i) => [nombre[r.dataset], r.nombres.replace(/gis\.gis\./g, ""), usadas[r.dataset]].map((c, j) => ({ text: c, options: { ...TD(i + 1), fontFace: j === 0 ? undefined : "Courier New", fontSize: 12, bold: j === 0 } }))));
    s.addTable(rows, { x: M, y: 1.75, w: W - 2 * M, colW: [2.2, 7.4, 2.533], rowH: 0.7, border: tborder, objectName: "tabla-columnas" });
    txt(s, "Excel del padrón: 7 u 8 hojas (Padron, MovPadron, Censo, Vehículos, Catastro, ActEconom, Elecciones y, en dos ficheros, Educacion). Solo se usa «Padron».", { x: M, y: 6.0, w: W - 2 * M, h: 0.6, fontSize: 13, color: C.accent5 });
    s.addNotes("Detalle de las columnas originales de cada conjunto y de las que se conservan en las tablas tidy, por si preguntan qué se descartó.");
  }

  await pres.writeFile({ fileName: path.join(__dirname, OUT) });
  if (applyTheme) await applyTheme(path.join(__dirname, OUT), THEME);
  else console.warn("AVISO: apply_theme.js no encontrado; los colores de tema serán los de Office.");
  console.log("OK ->", OUT);
})().catch((e) => { console.error(e); process.exit(1); });
