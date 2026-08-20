// src/firebase/config.js
// Configuracion y puntos de entrada de Firebase (migrado del HTML original)

import { initializeApp } from 'firebase/app'
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInAnonymously,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  addDoc,
  updateDoc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore'
import {
  getStorage,
  ref,
  uploadString,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage'
import {
  getDatabase,
} from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyB-BDGpMhiNjSfGiGiGHHd6jbu5nQvoOfs',
  authDomain: 'ginadocente-unipamplona.firebaseapp.com',
  projectId: 'ginadocente-unipamplona',
  storageBucket: 'ginadocente-unipamplona.firebasestorage.app',
  messagingSenderId: '628380121872',
  appId: '1:628380121872:web:4766b1e2964b023f838395',
  measurementId: 'G-6QKYMFPRHH',
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

// Persistencia de sesión local en navegador para Google y Email Auth
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(err => {
    console.warn('Firebase Auth persistence error:', err)
  })
}

// Memoria local (offline) automatica
const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
})
// Diagnóstico de persistencia offline (persistentLocalCache ya la habilita)
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    console.log('Firestore: persistencia offline habilitada (persistentLocalCache).')
  })
}

const storage = getStorage(app)
const rtdb = getDatabase(app)

const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp')
const secondaryAuth = getAuth(secondaryApp)

const appId =
  typeof __app_id !== 'undefined' ? __app_id : 'unipamplona-english-app'

export {
  app,
  auth,
  db,
  storage,
  rtdb,
  secondaryApp,
  secondaryAuth,
  appId,
  firebaseConfig,
  // Re-exportaciones de auth
  signInAnonymously,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  // Re-exportaciones de firestore
  collection,
  onSnapshot,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  addDoc,
  updateDoc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  // Re-exportaciones de storage
  ref,
  uploadString,
  uploadBytes,
  getDownloadURL,
}
