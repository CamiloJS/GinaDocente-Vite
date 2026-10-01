// Pruebas del normalizador de marcado (que no se vean etiquetas crudas).
import { normalizarMarcado, textoPlano } from "../src/utils/textFormat.js";
import { URL_REGEX, extraerUrls, esPublicacionLarga } from "../src/utils/postLinks.js";

let ok = 0, fallos = 0;
const chequear = (nombre, cond, extra = "") => {
  if (cond) { ok++; console.log("  OK  " + nombre); }
  else { fallos++; console.log("  FALLA " + nombre + (extra ? " -> " + JSON.stringify(extra) : "")); }
};
const noTiene = (texto, marcas) => marcas.every((m) => !texto.includes(m));

console.log("\n== El caso real reportado por la docente ==");
const real = "Buenas tardes estimados estudiantes, [color=#e5e7eb]\n[/color]\nTeniendo en cuenta las respuestas de la mitad + 1 de los estudiantes que asistieron a la clase anterior, la próxima clase será mañana a las 6:10 am en el salón **SVR 212.\n**Recuerden el deber de consulta.\n\nMuchas gracias por su atención y de ser posible, **traigan su computador.**";
const r = normalizarMarcado(real);
chequear("no queda [color=... ni [/color]", noTiene(r, ["[color=", "[/color]"]), r);
chequear("los asteriscos que quedan estan en pares", r.split("\n").every((l) => (l.split("**").length - 1) % 2 === 0), r);
const rRenderizado = r.replace(/\*\*([\s\S]+?)\*\*/g, "$1");
chequear("al renderizar no se verian asteriscos", !rRenderizado.includes("**"), rRenderizado);
chequear("conserva el texto", r.includes("SVR 212.") && r.includes("traigan su computador.") && r.includes("Buenas tardes estimados estudiantes,"));
chequear("mantiene la negrita valida de una linea", r.includes("**traigan su computador.**"), r);

console.log("\n== Color que abarca varias lineas ==");
const multi = "[color=#ff0000]linea uno\nlinea dos\nlinea tres[/color]";
const m1 = normalizarMarcado(multi);
chequear("cierra y reabre por linea", m1 === "[color=#ff0000]linea uno[/color]\n[color=#ff0000]linea dos[/color]\n[color=#ff0000]linea tres[/color]", m1);

console.log("\n== Negrita y resaltado entre lineas ==");
const b1 = normalizarMarcado("**uno\ndos**");
chequear("negrita multilinea", b1 === "**uno**\n**dos**", b1);
const h1 = normalizarMarcado("==uno\ndos==");
chequear("resaltado multilinea", h1 === "==uno==\n==dos==", h1);

console.log("\n== Etiquetas huerfanas ==");
chequear("color sin cierre", normalizarMarcado("hola [color=#fff] mundo") === "hola  mundo");
chequear("cierre sin apertura", normalizarMarcado("hola [/color] mundo") === "hola  mundo");
chequear("negrita huerfana en una linea", normalizarMarcado("salon **SVR 212") === "salon SVR 212");
chequear("dos negritas validas se conservan", normalizarMarcado("**a** y **b**") === "**a** y **b**");
chequear("tres asteriscos: se limpian", normalizarMarcado("**a** y **b") === "a y b");
chequear("etiquetas conocidas sueltas", normalizarMarcado("[b]hola[/b] [size=12]x[/size]") === "hola x");

console.log("\n== HTML pegado ==");
chequear("span con color", normalizarMarcado('<span style="color:#00ff00">verde</span>') === "[color=#00ff00]verde[/color]");
chequear("strong y em", normalizarMarcado("<strong>a</strong> <em>b</em>") === "**a** *b*");
chequear("HTML suelto se elimina", normalizarMarcado("<span> texto </span>") === " texto ");
chequear("br y otros desconocidos no rompen", typeof normalizarMarcado("<div>algo</div>") === "string");

console.log("\n== Casos borde ==");
chequear("vacio", normalizarMarcado("") === "");
chequear("nulo", normalizarMarcado(null) === "");
chequear("texto normal intacto", normalizarMarcado("Hola, ¿cómo están? 2 * 3 = 6") === "Hola, ¿cómo están? 2 * 3 = 6");
chequear("corrige saltos de linea de Windows", normalizarMarcado("a\r\nb") === "a\nb");
chequear("lista con guiones intacta", normalizarMarcado("- uno\n- dos") === "- uno\n- dos");
chequear("encabezado intacto", normalizarMarcado("# Titulo") === "# Titulo");

console.log("\n== textoPlano (para Excel y datos guardados) ==");
chequear("quita negritas y resaltados", normalizarMarcado("**a** ~~b~~ ==c==") === "**a** ~~b~~ ==c==" && textoPlano("**a** ~~b~~ ==c==") === "a b c");
chequear("quita etiquetas de color", textoPlano("[color=#fff]hola[/color] mundo") === "hola mundo");
chequear("quita subrayado", textoPlano("<u>hola</u>") === "hola");
chequear("normaliza espacios", textoPlano("  varios    espacios  ") === "varios espacios");
chequear("conserva el texto normal", textoPlano("Hola, ¿cómo están?") === "Hola, ¿cómo están?");


console.log("\n== Enlaces dentro de publicaciones (color + link) ==");
const casoEnlaces = "1.[color=#ef4444]https://www.youtube.com/watch?v=q6LMjurECZM[/color]\n2. [color=#10b981]https://share.gemini.google/2lo1F63zp5ao [/color]";
const urls = extraerUrls(casoEnlaces);
chequear("la URL no se come el cierre [/color]", urls[0] === "https://www.youtube.com/watch?v=q6LMjurECZM", urls);
chequear("extrae las dos urls", urls.length === 2, urls);
chequear("no incluye el punto final", (URL_REGEX.exec("mira https://ejemplo.com/pagina.") || [""])[0] === "https://ejemplo.com/pagina");
chequear("una url sola", (URL_REGEX.exec("https://a.co") || [""])[0] === "https://a.co");
chequear("el marcado de color con enlaces sobrevive", normalizarMarcado(casoEnlaces) === casoEnlaces, normalizarMarcado(casoEnlaces));

console.log("\n== Ver mas en publicaciones largas ==");
chequear("publicacion corta no se colapsa", esPublicacionLarga("Hola clase, nos vemos mañana a las 6.") === false);
chequear("muchas lineas se colapsa", esPublicacionLarga(Array.from({ length: 12 }, (_, i) => "linea " + i).join("\n")) === true);
chequear("mucho texto se colapsa", esPublicacionLarga("x".repeat(420)) === true);
chequear("el enlace largo cuenta como texto", esPublicacionLarga(casoEnlaces + " " + "y".repeat(350)) === true);
chequear("vacio no se colapsa", esPublicacionLarga("") === false);

console.log(`\nRESULTADO: ${ok} OK, ${fallos} fallos\n`);
process.exit(fallos ? 1 : 0);
