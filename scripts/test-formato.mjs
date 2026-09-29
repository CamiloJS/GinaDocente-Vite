// Pruebas del normalizador de marcado (que no se vean etiquetas crudas).
import { normalizarMarcado } from "../src/utils/textFormat.js";

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

console.log(`\nRESULTADO: ${ok} OK, ${fallos} fallos\n`);
process.exit(fallos ? 1 : 0);
