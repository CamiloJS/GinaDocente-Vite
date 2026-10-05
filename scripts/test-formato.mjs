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

import {
  formatTimeAMPM,
  formatLastConnection,
  getChatIndicatorState,
  getLastConnectionTime,
  sortChatContacts,
} from "../src/utils/chatPresence.js";

console.log("\n== Ver mas en publicaciones largas ==");
chequear("publicacion corta no se colapsa", esPublicacionLarga("Hola clase, nos vemos mañana a las 6.") === false);
chequear("muchas lineas se colapsa", esPublicacionLarga(Array.from({ length: 12 }, (_, i) => "linea " + i).join("\n")) === true);
chequear("mucho texto se colapsa", esPublicacionLarga("x".repeat(420)) === true);
chequear("el enlace largo cuenta como texto", esPublicacionLarga(casoEnlaces + " " + "y".repeat(350)) === true);
chequear("vacio no se colapsa", esPublicacionLarga("") === false);

console.log("\n== Ultima conexion AM/PM e indicadores de chat ==");
const baseNow = new Date(2026, 9, 5, 18, 0, 0).getTime(); // 5 oct 2026, 6:00 PM
const todayAfternoon = new Date(2026, 9, 5, 15, 45, 0).getTime(); // 3:45 PM
const todayMorning = new Date(2026, 9, 5, 9, 5, 0).getTime(); // 9:05 AM
const yesterdayNight = new Date(2026, 9, 4, 22, 30, 0).getTime(); // 10:30 PM ayer
const olderDate = new Date(2026, 9, 1, 0, 15, 0).getTime(); // 1 oct, 12:15 AM

chequear("formato 12h PM", formatTimeAMPM(todayAfternoon) === "3:45 PM", formatTimeAMPM(todayAfternoon));
chequear("formato 12h AM", formatTimeAMPM(todayMorning) === "9:05 AM", formatTimeAMPM(todayMorning));
chequear("formato 12h medianoche", formatTimeAMPM(olderDate) === "12:15 AM", formatTimeAMPM(olderDate));
chequear("ultima vez hoy", formatLastConnection(todayAfternoon, baseNow) === "Última vez a las 3:45 PM", formatLastConnection(todayAfternoon, baseNow));
chequear("ultima vez ayer", formatLastConnection(yesterdayNight, baseNow) === "Última vez ayer a las 10:30 PM", formatLastConnection(yesterdayNight, baseNow));
chequear("ultima vez fecha anterior", formatLastConnection(olderDate, baseNow) === "Última vez 1 oct a las 12:15 AM", formatLastConnection(olderDate, baseNow));
chequear("sin conexion devuelve Desconectado", formatLastConnection(0, baseNow) === "Desconectado");

const mockStudents = [
  { id: "est_antiguo", name: "Andres Antiguo", role: "student" },
  { id: "est_reciente", name: "Beatriz Reciente", role: "student" },
  { id: "est_rojo", name: "Carlos SinResponder", role: "student" },
  { id: "est_azul", name: "Diana MensajeNuevo", role: "student" },
  { id: "est_online", name: "Elena Conectada", role: "student" },
  { id: "est_nunca", name: "Fabian NuncaConectado", role: "student" },
];

const mockPresence = {
  est_online: { isOnline: true, status: "online", lastPing: baseNow - 10000 },
  est_reciente: { isOnline: false, status: "offline", lastSeen: baseNow - 60000 * 5 }, // hace 5 min
  est_antiguo: { isOnline: false, status: "offline", lastSeen: baseNow - 86400000 * 3 }, // hace 3 dias
  est_rojo: { isOnline: false, status: "offline", lastSeen: baseNow - 86400000 * 2 },
  est_azul: { isOnline: false, status: "offline", lastSeen: baseNow - 86400000 * 4 },
};

const chatIdRojo = `dm_${["teacher", "est_rojo"].sort().join("_")}`;
const chatIdAzul = `dm_${["teacher", "est_azul"].sort().join("_")}`;
const chatIdRespondido = `dm_${["teacher", "est_antiguo"].sort().join("_")}`;

const mockUnread = {
  [chatIdAzul]: true,
  [chatIdRojo]: false,
};

const mockLastMessages = {
  [chatIdAzul]: { text: "Profe tengo una duda", author: "Diana", authorId: "est_azul", authorRole: "student", createdAt: baseNow - 300000 },
  [chatIdRojo]: { text: "Ya envie el taller", author: "Carlos", authorId: "est_rojo", authorRole: "student", createdAt: baseNow - 600000 },
  [chatIdRespondido]: { text: "Listo Andres", author: "Profesora", authorId: "teacher", authorRole: "teacher", createdAt: baseNow - 100000 },
};

chequear(
  "puntico azul para mensaje nuevo no abierto",
  getChatIndicatorState({ user: mockStudents[3], chatId: chatIdAzul, unreadChats: mockUnread, lastMessages: mockLastMessages, myChatId: "teacher", role: "teacher" }) === "unread"
);
chequear(
  "puntico rojo para mensaje abierto pero sin responder por docente",
  getChatIndicatorState({ user: mockStudents[2], chatId: chatIdRojo, unreadChats: mockUnread, lastMessages: mockLastMessages, myChatId: "teacher", role: "teacher" }) === "unanswered"
);
chequear(
  "sin puntico cuando docente ya respondio",
  getChatIndicatorState({ user: mockStudents[0], chatId: chatIdRespondido, unreadChats: mockUnread, lastMessages: mockLastMessages, myChatId: "teacher", role: "teacher" }) === "none"
);
chequear(
  "estudiante no ve puntico rojo de sin responder",
  getChatIndicatorState({ user: mockStudents[2], chatId: chatIdRojo, unreadChats: mockUnread, lastMessages: mockLastMessages, myChatId: "est_otro", role: "student" }) === "none"
);

const ordenados = sortChatContacts(mockStudents, {
  userPresence: mockPresence,
  unreadChats: mockUnread,
  lastMessages: mockLastMessages,
  myChatId: "teacher",
  role: "teacher",
});
const idsOrdenados = ordenados.map((u) => u.id);
const esperado = ["est_online", "est_azul", "est_rojo", "est_reciente", "est_antiguo", "est_nunca"];
chequear(
  "orden correcto: conectados -> sin responder (azul luego rojo) -> ultima conexion reciente -> conexion antigua -> sin conexion",
  JSON.stringify(idsOrdenados) === JSON.stringify(esperado),
  idsOrdenados
);

// Casos borde adicionales: CamiloDocente, documentos legacy sin authorId, max(lastSeen, lastPing)
const chatIdCamilo = `dm_${["camilodocente", "est_rojo"].sort().join("_")}`;
const legacyStudentMsg = { [chatIdCamilo]: { text: "Hola profe Camilo", author: "Carlos", createdAt: baseNow - 50000 } };
const legacyTeacherMsg = { [chatIdCamilo]: { text: "Hola Carlos", author: "Prof. Camilo", createdAt: baseNow - 20000 } };
chequear(
  "CamiloDocente detecta mensaje sin responder en documento legacy",
  getChatIndicatorState({ user: mockStudents[2], chatId: chatIdCamilo, unreadChats: {}, lastMessages: legacyStudentMsg, myChatId: "camilodocente", role: "teacher" }) === "unanswered"
);
chequear(
  "CamiloDocente detecta mensaje ya respondido en documento legacy",
  getChatIndicatorState({ user: mockStudents[2], chatId: chatIdCamilo, unreadChats: {}, lastMessages: legacyTeacherMsg, myChatId: "camilodocente", role: "teacher" }) === "none"
);
chequear(
  "getLastConnectionTime toma el mayor entre lastSeen y lastPing",
  getLastConnectionTime("est_cierre_abrupto", { est_cierre_abrupto: { lastSeen: 1000, lastPing: 5000 } }) === 5000
);
chequear(
  "formatLastConnection maneja null/undefined/negativos sin romper",
  formatLastConnection(null, baseNow) === "Desconectado" &&
  formatLastConnection(undefined, baseNow) === "Desconectado" &&
  formatLastConnection(-100, baseNow) === "Desconectado"
);

// Nuevos tests de regresion para bugs corregidos en revision
chequear(
  "getLastConnectionTime usa userMappings (lastLogin / lastUpdated) cuando no hay userPresence",
  getLastConnectionTime("est_sin_presencia", {}, { est_sin_presencia: { lastLogin: 3000, lastUpdated: 7500 } }) === 7500
);

chequear(
  "getLastConnectionTime toma Math.max entre presenceTs, userMappings y mensaje del estudiante (no retorna temprano)",
  getLastConnectionTime(
    "est_msg_mas_reciente",
    { est_msg_mas_reciente: { lastSeen: 4000, lastPing: 4500 } },
    { est_msg_mas_reciente: { lastUpdated: 5000 } },
    { authorId: "est_msg_mas_reciente", authorRole: "student", createdAt: 9000 }
  ) === 9000
);

chequear(
  "getLastConnectionTime preserva lastStudentAt cuando el ultimo mensaje es respuesta del docente",
  getLastConnectionTime(
    "est_respondido",
    {},
    {},
    { authorId: "teacher", authorRole: "teacher", createdAt: 12000, lastStudentAt: 8500 }
  ) === 8500
);

chequear(
  "Estudiante llamado Camilo escribiendo a Profe Gina en mensaje legacy se detecta como estudiante",
  getChatIndicatorState({
    user: { id: "camilo_est", name: "Camilo Perez", role: "student" },
    chatId: "dm_camilo_est_teacher",
    unreadChats: {},
    lastMessages: { dm_camilo_est_teacher: { text: "Hola profe Gina", author: "Camilo", createdAt: baseNow - 10000 } },
    myChatId: "teacher",
    role: "teacher",
  }) === "unanswered"
);

const conectadosDesempate = sortChatContacts(
  [
    { id: "on_viejo", name: "Online Viejo", role: "student" },
    { id: "on_nuevo", name: "Online Nuevo", role: "student" },
  ],
  {
    userPresence: {
      on_viejo: { isOnline: true, status: "online", lastPing: baseNow },
      on_nuevo: { isOnline: true, status: "online", lastPing: baseNow },
    },
    unreadChats: {},
    lastMessages: {
      dm_on_viejo_teacher: { authorId: "on_viejo", authorRole: "student", createdAt: 1000 },
      dm_on_nuevo_teacher: { authorId: "on_nuevo", authorRole: "student", createdAt: 5000 },
    },
    myChatId: "teacher",
    role: "teacher",
  }
);
chequear(
  "sortChatContacts desempata usuarios conectados con mensajes pendientes por mensaje mas reciente",
  conectadosDesempate.map((u) => u.id).join(",") === "on_nuevo,on_viejo",
  conectadosDesempate.map((u) => u.id)
);

console.log(`\nRESULTADO: ${ok} OK, ${fallos} fallos\n`);
process.exit(fallos ? 1 : 0);


