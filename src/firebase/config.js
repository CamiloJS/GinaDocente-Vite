// src/firebase/config.js
// Configuracion y puntos de entrada de Firebase (migrado del HTML original)

import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
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
  orderBy,
  limit,
} from 'firebase/firestore'
import {
  getStorage,
  ref,
  uploadString,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage'

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

// Memoria local (offline) automatica
const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
})

const storage = getStorage(app)

const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp')
const secondaryAuth = getAuth(secondaryApp)

const appId =
  typeof __app_id !== 'undefined' ? __app_id : 'unipamplona-english-app'

export {
  app,
  auth,
  db,
  storage,
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
  orderBy,
  limit,
  // Re-exportaciones de storage
  ref,
  uploadString,
  uploadBytes,
  getDownloadURL,
}
