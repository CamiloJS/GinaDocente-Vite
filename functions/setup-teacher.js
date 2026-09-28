#!/usr/bin/env node
/**
 * SCRIPT DE SETUP: Asignar rol teacher a la profesora Gina
 *
 * Ejecutar UNA SOLA VEZ después de deployar las Cloud Functions:
 *   node functions/setup-teacher.js
 *
 * Requiere: GOOGLE_APPLICATION_CREDENTIALS apuntando a un service account
 * con permisos de Firebase Admin (Firebase Console > Project Settings > Service Accounts)
 */

const admin = require("firebase-admin");

// Inicializar con credenciales por defecto (GOOGLE_APPLICATION_CREDENTIALS)
admin.initializeApp({
  projectId: "ginadocente-unipamplona",
});

const TEACHER_EMAIL = "ginamarcelaquintana19@gmail.com";

async function setup() {
  try {
    console.log(`Buscando usuario con email: ${TEACHER_EMAIL}`);
    const user = await admin.auth().getUserByEmail(TEACHER_EMAIL);

    console.log(`Usuario encontrado: ${user.uid}`);
    console.log(`Claims actuales:`, JSON.stringify(user.customClaims || {}));

    await admin.auth().setCustomUserClaims(user.uid, { role: "teacher" });

    console.log(`✅ Custom claim 'role: teacher' asignado exitosamente a ${user.email} (${user.uid})`);
    console.log(`   El usuario debe cerrar sesión y volver a entrar para que el claim surta efecto.`);

    // Verificar
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log(`Claims actualizados:`, JSON.stringify(updatedUser.customClaims));

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

setup();
