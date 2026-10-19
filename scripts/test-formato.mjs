import { normalizarMarcado, textoPlano } from "../src/utils/textFormat.js";
import { URL_REGEX, extraerUrls, esPublicacionLarga } from "../src/utils/postLinks.js";
import { isHeicFile, isHeicUrl, isImageLikeFile, isImageLikeUrl } from "../src/utils/heicConverter.js";

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

import { containsBadWords } from "../api/filter.js";
import { tagToHtml, htmlToTag } from "../src/utils/textFormat.js";

console.log("\n== Regresiones corregidas: RichVisualEditor (tagToHtml/htmlToTag), subrayado y filtro de lenguaje ==");
chequear(
  "htmlToTag(tagToHtml('[color=#ef4444]texto rojo[/color]')) conserva el color cuando color: es la primera propiedad CSS",
  htmlToTag(tagToHtml("[color=#ef4444]texto rojo[/color]")) === "[color=#ef4444]texto rojo[/color]",
  htmlToTag(tagToHtml("[color=#ef4444]texto rojo[/color]"))
);
chequear(
  "htmlToTag soporta span con background-color y color combinados",
  htmlToTag('<span style="background-color: rgb(254, 240, 138); color: #ef4444;">combinado</span>') === "[color=#ef4444]==combinado==[/color]"
);
chequear(
  "htmlToTag soporta spans anidados de color y resaltado",
  htmlToTag('<span style="color: #3b82f6;"><span style="background-color: #fef08a;">anidado</span></span>') === "[color=#3b82f6]==anidado==[/color]"
);
chequear(
  "htmlToTag ignora background-color transparent o rgba(0,0,0,0)",
  htmlToTag('<span style="background-color: transparent; color: #10b981;">sin fondo</span>') === "[color=#10b981]sin fondo[/color]" &&
  htmlToTag('<span style="background-color: rgba(0, 0, 0, 0);">texto limpio</span>') === "texto limpio"
);
chequear(
  "htmlToTag(tagToHtml(...)) no duplica saltos de linea en encabezados, citas ni listas",
  htmlToTag(tagToHtml("### Titulo\n> Cita\n- Item\nTexto final")) === "### Titulo\n> Cita\n- Item\nTexto final",
  htmlToTag(tagToHtml("### Titulo\n> Cita\n- Item\nTexto final"))
);
chequear(
  "normalizarMarcado conserva <u>subrayado</u> balanceado",
  normalizarMarcado("Texto con <u>subrayado</u> importante") === "Texto con <u>subrayado</u> importante"
);
chequear(
  "normalizarMarcado cierra y reabre <u> multilinea",
  normalizarMarcado("<u>linea 1\nlinea 2</u>") === "<u>linea 1</u>\n<u>linea 2</u>"
);
chequear(
  "normalizarMarcado elimina <u> huerfano sin cierre",
  normalizarMarcado("Texto <u>sin cerrar") === "Texto sin cerrar"
);
chequear(
  "normalizarMarcado no confunde background-color con color de texto",
  !normalizarMarcado('<span style="background-color:#fef08a">texto</span>').includes("[color=")
);
chequear(
  "containsBadWords detecta insultos seguidos de signos de exclamacion",
  containsBadWords("¡Eres un idiota!") === true &&
  containsBadWords("pendejo!!!") === true &&
  containsBadWords("!d!0t4!") === true &&
  containsBadWords("p3nd3j0!") === true &&
  containsBadWords("¡Hola clase, bienvenidos!") === false
);

console.log("\n== Detección Universal de HEIC/HEIF (iPhone / iOS) ==");
chequear(
  "isHeicFile detecta tipo MIME image/heic e image/heif",
  isHeicFile({ type: "image/heic", name: "IMG_001.heic" }) === true &&
  isHeicFile({ type: "image/heif", name: "IMG_002.heif" }) === true
);
chequear(
  "isHeicFile detecta archivos de iPhone con type vacío pero extensión .heic/.heif",
  isHeicFile({ type: "", name: "IMG_1234.HEIC" }) === true &&
  isHeicFile({ type: "application/octet-stream", name: "photo.heif" }) === true
);
chequear(
  "isHeicFile no clasifica erróneamente PNG o JPEG",
  isHeicFile({ type: "image/jpeg", name: "foto.jpg" }) === false &&
  isHeicFile({ type: "image/png", name: "captura.png" }) === false
);
chequear(
  "isHeicUrl detecta URLs remotas con .heic y con parámetros de consulta de Firebase",
  isHeicUrl("https://firebasestorage.googleapis.com/v0/b/app/o/posts%2Fphoto.heic?alt=media&token=123") === true &&
  isHeicUrl("https://englishtech.vercel.app/uploads/test.HEIC#page=1") === true &&
  isHeicUrl("https://englishtech.vercel.app/foto.jpg") === false
);
chequear(
  "isImageLikeFile reconoce imágenes estándar y HEIC incluso con MIME ausente",
  isImageLikeFile({ name: "tarea_foto.HEIC", type: "" }) === true &&
  isImageLikeFile({ name: "documento.pdf", type: "application/pdf" }) === false &&
  isImageLikeFile({ name: "trabajo.docx", type: "" }) === false
);
chequear(
  "isImageLikeUrl identifica URLs directas de imagen",
  isImageLikeUrl("https://example.com/imagen.jpg") === true &&
  isImageLikeUrl("https://example.com/photo.heic?alt=media") === true &&
  isImageLikeUrl("data:image/png;base64,iVBORw0KGgo=") === true &&
  isImageLikeUrl("https://example.com/documento.pdf") === false
);

console.log("\n== Preservación de Cuentas y Corrección de Nombres de Estudiantes ==");

// Helper de normalización de correos
const normalizeEmail = (em) => {
  if (!em) return '';
  const clean = String(em).trim().toLowerCase();
  const [local, domain] = clean.split('@');
  if (!domain) return clean;
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return local.replace(/\./g, '') + '@gmail.com';
  }
  return clean;
};

chequear(
  "normalizeEmail normaliza mayúsculas y puntos en Gmail",
  normalizeEmail("Pepito.Perez@Gmail.COM") === "pepitoperez@gmail.com" &&
  normalizeEmail("pepito.carlos.perez@googlemail.com") === "pepitocarlosperez@gmail.com" &&
  normalizeEmail("alumno@unipamplona.edu.co") === "alumno@unipamplona.edu.co"
);

// Simulación de resolución de cuenta en Google Sign In
const resolveExistingStudentAccount = (gUser, userMappings) => {
  const email = gUser.email || '';
  const fullName = gUser.displayName || 'Estudiante';
  const normGoogleEmail = normalizeEmail(email);

  const existingEntry = Object.entries(userMappings || {}).find(([k, v]) => 
    (v?.uid && v.uid === gUser.uid) ||
    (v?.email && normalizeEmail(v.email) === normGoogleEmail) || 
    (v?.googleEmail && normalizeEmail(v.googleEmail) === normGoogleEmail)
  );

  if (existingEntry) {
    const userKey = existingEntry[0];
    const targetFullName = existingEntry[1]?.fullName?.trim() || fullName;
    const targetRole = existingEntry[1]?.role || 'student';
    return {
      isExisting: true,
      shouldPromptOnboarding: false,
      userKey,
      fullName: targetFullName,
      role: targetRole
    };
  }

  return {
    isExisting: false,
    shouldPromptOnboarding: true,
    suggestedUsername: email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || 'student',
    fullName
  };
};

// Caso 1: Estudiante entra con Google como "Pepito Perez", profesor le corrige el nombre a "Pepito Carlos Perez Gonzalez"
const mockMappings = {
  pepito: {
    fullName: "Pepito Carlos Perez Gonzalez", // Nombre corregido por el docente
    customLabel: "Alumno",
    email: "pepito.perez@gmail.com",
    role: "student",
    uid: "google_uid_12345",
    onboardingCompleted: true
  }
};

const resolved1 = resolveExistingStudentAccount(
  { uid: "google_uid_12345", email: "pepitoperez@gmail.com", displayName: "Pepito Perez" },
  mockMappings
);

chequear(
  "Estudiante con nombre corregido por profesor ingresa directo sin pedir usuario nuevo",
  resolved1.isExisting === true && resolved1.shouldPromptOnboarding === false && resolved1.userKey === "pepito"
);

chequear(
  "Se preserva el nombre completo asignado por el docente en lugar del nombre corto de Google",
  resolved1.fullName === "Pepito Carlos Perez Gonzalez"
);

// Caso 2: Estudiante creado por docente o sin el flag onboardingCompleted previamente
const mockMappingsWithoutFlag = {
  marianagomez: {
    fullName: "Mariana Gomez Herrera",
    email: "mariana.gomez@gmail.com",
    role: "student"
    // onboardingCompleted es undefined
  }
};

const resolved2 = resolveExistingStudentAccount(
  { uid: "new_google_uid_67890", email: "mariana.gomez@gmail.com", displayName: "Mariana" },
  mockMappingsWithoutFlag
);

chequear(
  "Cuenta existente sin onboardingCompleted NO pide crear usuario nuevo y entra directo",
  resolved2.isExisting === true && resolved2.shouldPromptOnboarding === false && resolved2.userKey === "marianagomez" && resolved2.fullName === "Mariana Gomez Herrera"
);

// Caso 3: Coincidencia por correo con puntos alternos de Gmail
const mockMappingsDots = {
  carlos_m: {
    fullName: "Carlos Mateo Mendoza",
    email: "carlosmendoza@gmail.com",
    role: "student"
  }
};

const resolved3 = resolveExistingStudentAccount(
  { uid: "uid_dots_abc", email: "carlos.mendoza@gmail.com", displayName: "Carlos" },
  mockMappingsDots
);

chequear(
  "Reconoce cuenta de Google incluso si el correo tiene puntos diferentes en Gmail",
  resolved3.isExisting === true && resolved3.userKey === "carlos_m"
);

// Caso 4: Sincronización reactiva de sesión activa cuando el profesor cambia el nombre
const syncSessionName = (currentSession, userMappings, cleanUser) => {
  const studentData = userMappings[cleanUser];
  if (studentData?.fullName && studentData.fullName.trim() !== currentSession.name) {
    return {
      ...currentSession,
      name: studentData.fullName.trim()
    };
  }
  return currentSession;
};

const initialSession = { email: "pepito@gmail.com", uid: "google_uid_12345", userKey: "pepito", name: "Pepito Perez", role: "student" };
const updatedSession = syncSessionName(initialSession, mockMappings, "pepito");

chequear(
  "Sesión activa se actualiza automáticamente con el nuevo nombre completo del estudiante",
  updatedSession.name === "Pepito Carlos Perez Gonzalez" && updatedSession.userKey === "pepito"
);

// Caso 5: Resolución dinámica del nombre completo del estudiante en comentarios (resolveUserDisplayName)
import { resolveUserDisplayName, TEACHER_NAME, SECOND_TEACHER_NAME } from "../src/utils/helpers.js";

const testUserMappings = {
  camila_r: {
    fullName: "Maria Camila Rodríguez Monterrey",
    email: "camila.rodriguez@gmail.com",
    uid: "uid_camila_123",
    role: "student"
  },
  pepito: {
    fullName: "Pepito Carlos Perez Gonzalez",
    email: "pepito@gmail.com",
    uid: "google_uid_12345",
    role: "student"
  },
  camilodocente: {
    fullName: "Camilo Jaimes",
    email: "camilodocente@unipamplona.edu.co",
    role: "teacher"
  },
  teacher: {
    fullName: "Gina Marcela Quintana Delgado",
    email: "ginadocente@unipamplona.edu.co",
    role: "teacher"
  }
};

// 5.1 Comentario histórico con solo nombre estático previo "Camila Rodríguez"
const resolvedName1 = resolveUserDisplayName("Camila Rodríguez", testUserMappings, "Camila Rodríguez");
chequear(
  "Comentario histórico con string 'Camila Rodríguez' resuelve al nombre completo actualizado 'Maria Camila Rodríguez Monterrey'",
  resolvedName1 === "Maria Camila Rodríguez Monterrey",
  resolvedName1
);

// 5.2 Objeto de comentario con author antiguo
const commentObj1 = {
  id: "comm_101",
  author: "Camila Rodríguez",
  authorUsername: "camila_r",
  text: "Te quedo muy lindo <3"
};
const resolvedName2 = resolveUserDisplayName(commentObj1, testUserMappings, commentObj1.author);
chequear(
  "Objeto de comentario con username 'camila_r' resuelve al nombre completo 'Maria Camila Rodríguez Monterrey'",
  resolvedName2 === "Maria Camila Rodríguez Monterrey",
  resolvedName2
);

// 5.3 Objeto de comentario sin username pero con nombre previo con tildes distintas o palabras clave
const commentObj2 = {
  id: "comm_102",
  author: "Camila Rodriguez",
  text: "Buen trabajo"
};
const resolvedName3 = resolveUserDisplayName(commentObj2, testUserMappings, commentObj2.author);
chequear(
  "Objeto de comentario sin username y sin tildes resuelve por coincidencia de palabras al nombre completo",
  resolvedName3 === "Maria Camila Rodríguez Monterrey",
  resolvedName3
);

// 5.4 Comentario de docente Gina Hurtado o Camilo Jaimes
const teacherComment = {
  author: "Profesora",
  authorUsername: "ginadocente"
};
const resolvedTeacher = resolveUserDisplayName(teacherComment, testUserMappings);
chequear(
  "Comentario de docente resuelve a TEACHER_NAME (" + TEACHER_NAME + ")",
  resolvedTeacher === TEACHER_NAME,
  resolvedTeacher
);

// 5.5 Comentario de Camilo Docente
const camiloComment = {
  author: "Camilo Docente",
  authorUsername: "camilodocente"
};
const resolvedCamilo = resolveUserDisplayName(camiloComment, testUserMappings);
chequear(
  "Comentario de Camilo resuelve a SECOND_TEACHER_NAME (" + SECOND_TEACHER_NAME + ")",
  resolvedCamilo === SECOND_TEACHER_NAME,
  resolvedCamilo
);

// 5.6 Comentario de usuario desconocido
const unknownComment = {
  author: "Invitado Externo",
  authorUsername: "invitado"
};
const resolvedUnknown = resolveUserDisplayName(unknownComment, testUserMappings);
chequear(
  "Comentario de usuario no registrado preserva su nombre de autor original",
  resolvedUnknown === "Invitado Externo",
  resolvedUnknown
);

console.log(`\nRESULTADO: ${ok} OK, ${fallos} fallos\n`);
process.exit(fallos ? 1 : 0);


