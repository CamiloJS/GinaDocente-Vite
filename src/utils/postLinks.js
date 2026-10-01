// src/utils/postLinks.js
// Deteccion de enlaces y tamano de las publicaciones (probado en scripts/test-formato.mjs).
import { textoPlano } from './textFormat.js';

// Una URL dentro de un texto. La ultima clase excluye la puntuacion final y los
// corchetes para que NO se coma cierres de etiquetas como [/color] ni puntos finales.
export const URL_REGEX = /https?:\/\/[^\s<>\[\]"']*[^\s<>\[\]"'().,;:!?]/i;

/** Todas las URLs de un texto (regex nueva en cada llamada para no arrastrar estado). */
export function extraerUrls(texto) {
  const t = String(texto == null ? '' : texto);
  return t.match(new RegExp(URL_REGEX.source, 'gi')) || [];
}

/** True si la publicacion es "mas o menos larga" y conviene mostrar "Ver mas". */
export function esPublicacionLarga(texto, limiteLineas = 10, limiteCaracteres = 380) {
  const t = String(texto == null ? '' : texto);
  if (!t.trim()) return false;
  if (t.split('\n').length > limiteLineas) return true;
  return textoPlano(t).length > limiteCaracteres;
}
