const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

initializeApp();

/**
 * Cloud Function para asignar el custom claim 'role: teacher' a un usuario.
 * Solo puede ser ejecutada por un usuario que YA tenga el claim de teacher.
 *
 * Uso: Llamar desde la app después del login de la profesora:
 *   const setTeacherRole = httpsCallable(functions, 'setTeacherRole');
 *   await setTeacherRole({ uid: user.uid });
 */
exports.setTeacherRole = onCall({ region: "us-central1" }, async (request) => {
  // Verificar que quien llama YA es teacher
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado.");
  }

  const callerClaims = request.auth.token;
  if (callerClaims.role !== "teacher") {
    throw new HttpsError("permission-denied", "Solo la profesora puede asignar roles.");
  }

  const { uid } = request.data;
  if (!uid || typeof uid !== "string") {
    throw new HttpsError("invalid-argument", "UID requerido.");
  }

  await getAuth().setCustomUserClaims(uid, { role: "teacher" });

  // Forzar refresh del token para que el claim surta efecto
  await getAuth().createCustomToken(uid, { role: "teacher" });

  return { success: true, message: `Rol teacher asignado a ${uid}` };
});

/**
 * Cloud Function para remover el custom claim 'role: teacher' de un usuario.
 */
exports.removeTeacherRole = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado.");
  }

  const callerClaims = request.auth.token;
  if (callerClaims.role !== "teacher") {
    throw new HttpsError("permission-denied", "Solo la profesora puede remover roles.");
  }

  const { uid } = request.data;
  if (!uid || typeof uid !== "string") {
    throw new HttpsError("invalid-argument", "UID requerido.");
  }

  await getAuth().setCustomUserClaims(uid, {});
  return { success: true, message: `Rol removido de ${uid}` };
});

/**
 * Script de setup inicial: Asigna el claim de teacher al primer usuario.
 * Ejecutar una sola vez desde Firebase Console > Functions > Shell:
 *   const admin = require('firebase-admin');
 *   admin.initializeApp();
 *   const user = await admin.auth().getUserByEmail('ginamarcelaquintana19@gmail.com');
 *   await admin.auth().setCustomUserClaims(user.uid, { role: 'teacher' });
 *   console.log('Teacher claim asignado a:', user.uid);
 */
