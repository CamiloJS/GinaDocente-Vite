// src/utils/palabras.js
// Utilidades para el tipo "Ordenar la oracion" (probado en scripts/test-scoring.mjs).

/** Hash simple y estable para una cadena. */
const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < String(s).length; i++) {
    h ^= String(s).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};

/**
 * Devuelve las palabras ({ w, idx }) en orden desordenado pero ESTABLE
 * (misma semilla -> mismo orden, para que no cambie al re-renderizar).
 * Evita que queden exactamente en el orden correcto.
 */
export function desordenarPalabras(words = [], semilla = '') {
  const arr = words.map((w, idx) => ({ w, idx }));
  let s = hash(semilla) || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  if (arr.length > 1 && arr.every((x, i) => x.idx === i)) {
    const tmp = arr[0];
    arr[0] = arr[1];
    arr[1] = tmp;
  }
  return arr;
}
