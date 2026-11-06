// src/utils/heicConverter.js
// Soporte universal para imágenes HEIC/HEIF (iPhone / iOS) en todos los navegadores y dispositivos
// (Windows 7/10/11, Android, iOS, macOS, Linux).

import { useState, useEffect } from 'react';
import { ref, getBlob } from 'firebase/storage';
import { storage } from '../firebase/config.js';

/**
 * Extensiones reconocidas de imágenes convencionales y HEIC
 */
export const IMAGE_EXTENSIONS_REGEX = /\.(jpe?g|png|webp|gif|bmp|heic|heif|svg|avif|ico)(\?.*)?$/i;
export const HEIC_EXTENSIONS_REGEX = /\.(heic|heif)(\?.*)?$/i;

/**
 * Determina de forma síncrona si un objeto File o Blob corresponde a formato HEIC/HEIF
 */
export const isHeicFile = (file) => {
  if (!file) return false;
  const type = String(file.type || '').toLowerCase();
  const name = String(file.name || '').toLowerCase();

  if (
    type === 'image/heic' ||
    type === 'image/heif' ||
    type === 'image/heic-sequence' ||
    type === 'image/heif-sequence'
  ) {
    return true;
  }

  if (HEIC_EXTENSIONS_REGEX.test(name)) {
    return true;
  }

  return false;
};

/**
 * Determina si una URL remota apunta a una imagen en formato HEIC/HEIF
 */
export const isHeicUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.split('#')[0].toLowerCase();
  const pathPart = clean.split('?')[0];
  if (HEIC_EXTENSIONS_REGEX.test(pathPart)) return true;
  if (clean.includes('.heic') || clean.includes('.heif')) return true;
  if (clean.includes('/heic') || clean.includes('image%2fheic')) return true;
  if (clean.includes('/heif') || clean.includes('image%2fheif')) return true;
  return false;
};

/**
 * Determina si un archivo File/Blob representa una imagen (incluyendo HEIC y sin MIME estándar)
 */
export const isImageLikeFile = (file) => {
  if (!file) return false;
  const type = String(file.type || '').toLowerCase();
  const name = String(file.name || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  if (IMAGE_EXTENSIONS_REGEX.test(name)) return true;
  return false;
};

/**
 * Determina si una URL representa una imagen directa
 */
export const isImageLikeUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.split('#')[0].toLowerCase();
  if (clean.startsWith('data:image/')) return true;
  if (clean.startsWith('blob:')) return true;
  const pathPart = clean.split('?')[0];
  if (IMAGE_EXTENSIONS_REGEX.test(pathPart)) return true;
  if (isHeicUrl(url)) return true;
  return false;
};

/**
 * Inspección asíncrona de los primeros bytes (Magic Bytes) para detectar contenedores ISO BMFF HEIC
 */
export const isHeicBlobAsync = async (blob) => {
  if (!blob || !(blob instanceof Blob)) return false;
  if (isHeicFile(blob)) return true;
  try {
    const slice = blob.slice(0, 24);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.length >= 12) {
      const ftyp = String.fromCharCode(...bytes.slice(4, 8));
      if (ftyp === 'ftyp') {
        const brand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase();
        if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) {
          return true;
        }
      }
    }
  } catch {
    // Si no se puede leer el buffer, continuar sin bloquear
  }
  return false;
};

/**
 * Extrae el path decodificado de un recurso en Firebase Storage
 */
const extractFirebaseStoragePath = (url) => {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/o\/([^?#]+)/);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return null;
};

/**
 * Escanea un buffer binario en busca de una imagen JPEG incrustada (típica en fotos HEIC de iPhone)
 */
const extractEmbeddedJpegBlob = (bytes) => {
  if (!bytes || bytes.length < 2000) return null;
  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8 && bytes[i + 2] === 0xFF) {
      // SOI de JPEG encontrado, buscar el EOI (0xFF 0xD9) más lejano
      for (let j = bytes.length - 2; j > i + 1000; j--) {
        if (bytes[j] === 0xFF && bytes[j + 1] === 0xD9) {
          const slice = bytes.subarray(i, j + 2);
          if (slice.length > 2000) {
            return new Blob([slice], { type: 'image/jpeg' });
          }
        }
      }
    }
  }
  return null;
};

// Mapeo conocido de URLs HEIC históricas que ya fueron convertidas a JPEG de alta fidelidad
export const KNOWN_CONVERTED_URLS = new Map([
  [
    '1790548582402_27hc3q.jpg',
    'https://firebasestorage.googleapis.com/v0/b/ginadocente-unipamplona.firebasestorage.app/o/unipamplona-english-app%2Fcomments%2F1790548582402_27hc3q_converted.jpg?alt=media&token=68037f53-aeb2-4455-a3fa-43a438075a5f'
  ],
  [
    '1790548582402_27hc3q',
    'https://firebasestorage.googleapis.com/v0/b/ginadocente-unipamplona.firebasestorage.app/o/unipamplona-english-app%2Fcomments%2F1790548582402_27hc3q_converted.jpg?alt=media&token=68037f53-aeb2-4455-a3fa-43a438075a5f'
  ]
]);

export const getKnownConvertedUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.includes('_converted.')) return null;
  for (const [key, convertedUrl] of KNOWN_CONVERTED_URLS.entries()) {
    if (url.includes(key)) {
      return convertedUrl;
    }
  }
  return null;
};

/**
 * Convierte un File o Blob HEIC a formato JPEG universal
 */
export const convertHeicToJpeg = async (fileOrBlob, quality = 0.85) => {
  if (!fileOrBlob) return fileOrBlob;
  if (typeof window === 'undefined') return fileOrBlob;

  const isHeic = isHeicFile(fileOrBlob) || (await isHeicBlobAsync(fileOrBlob));
  if (!isHeic) return fileOrBlob;

  // 1. Intentar PRIMERO decodificación nativa con createImageBitmap (Safari en iOS/macOS y navegadores con decodificador HEIC por hardware)
  // En iPhone/Mac toma ~10ms en lugar de ~30s de WASM
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(fileOrBlob);
      if (bitmap && bitmap.width > 0 && bitmap.height > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(bitmap, 0, 0);
          const convertedBlob = await new Promise((res) =>
            canvas.toBlob(res, 'image/jpeg', quality)
          );
          if (convertedBlob && convertedBlob.size > 0) {
            const origName = (fileOrBlob && fileOrBlob.name) || 'photo.jpg';
            const safeName = origName
              .replace(/\.heic$/i, '.jpg')
              .replace(/\.heif$/i, '.jpg');
            try {
              return new File([convertedBlob], safeName, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
            } catch {
              convertedBlob.name = safeName;
              return convertedBlob;
            }
          }
        }
      }
    } catch {
      // Sin decodificador nativo HEIC en este SO/navegador (e.g. Chrome/Edge en Windows), continuar a WASM
    }
  }

  // 2. Intentar conversión con la librería heic2any (WASM)
  try {
    const heic2anyModule = await import('heic2any');
    const heic2any = heic2anyModule.default || heic2anyModule;
    const conversionPromise = heic2any({
      blob: fileOrBlob,
      toType: 'image/jpeg',
      quality: Math.min(0.95, Math.max(0.6, Number(quality) || 0.85))
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('heic2any timeout')), 8000)
    );
    const result = await Promise.race([conversionPromise, timeoutPromise]);
    const jpegBlob = Array.isArray(result) ? result[0] : result;
    if (jpegBlob && jpegBlob.size > 0) {
      const origName = (fileOrBlob && fileOrBlob.name) || 'photo.jpg';
      const safeName = origName
        .replace(/\.heic$/i, '.jpg')
        .replace(/\.heif$/i, '.jpg');

      try {
        return new File([jpegBlob], safeName, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
      } catch {
        jpegBlob.name = safeName;
        return jpegBlob;
      }
    }
  } catch (err) {
    console.warn('Conversión heic2any no completó o excedió timeout, intentando extractor de JPEG incrustado:', err);
  }

  // 3. Fallback: extraer el preview JPEG incrustado dentro del contenedor HEIC de Apple si existiera
  try {
    const buffer = await fileOrBlob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const embeddedBlob = extractEmbeddedJpegBlob(bytes);
    if (embeddedBlob) {
      const origName = (fileOrBlob && fileOrBlob.name) || 'photo.jpg';
      const safeName = origName.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
      try {
        return new File([embeddedBlob], safeName, { type: 'image/jpeg', lastModified: Date.now() });
      } catch {
        embeddedBlob.name = safeName;
        return embeddedBlob;
      }
    }
  } catch (extractErr) {
    console.warn('Fallback extractor de JPEG incrustado falló:', extractErr);
  }

  // Si falló toda conversión, retornar null para que el llamador active fallback UI sin usar blob roto
  return null;
};

// Caché en memoria y CacheStorage para no reconvertir
const heicConversionCache = new Map();
const pendingRemoteConversions = new Map();
const CACHE_NAME = 'heic-converted-v1';

const getCachedConvertedBlob = async (url) => {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await window.caches.open(CACHE_NAME);
    const match = await cache.match(url);
    if (match) {
      const b = await match.blob();
      if (b && b.size > 0) return b;
    }
  } catch {
    // Silently ignore CacheStorage errors
  }
  return null;
};

const storeConvertedBlobInCache = async (url, blob) => {
  if (typeof window === 'undefined' || !('caches' in window) || !blob) return;
  try {
    const cache = await window.caches.open(CACHE_NAME);
    const response = new Response(blob, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(blob.size)
      }
    });
    await cache.put(url, response);
  } catch {
    // Silently ignore CacheStorage errors
  }
};

/**
 * Resuelve una URL (incluso remota o de Firebase Storage) que apunte a un HEIC existente,
 * convirtiéndola al vuelo a un ObjectURL JPEG displayable en cualquier dispositivo.
 */
export const resolveHeicUrlToDisplayable = async (url) => {
  if (!url || typeof url !== 'string' || typeof window === 'undefined') return url;

  // 0a. Si es una URL con reemplazo conocido (p. ej. foto HEIC pre-convertida en Storage)
  const known = getKnownConvertedUrl(url);
  if (known) {
    heicConversionCache.set(url, known);
    return known;
  }

  // 0b. Enlaces de Google Drive -> convertir a endpoint de imagen directa
  const driveMatch = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    const driveImg = `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
    heicConversionCache.set(url, driveImg);
    return driveImg;
  }

  if (heicConversionCache.has(url)) {
    return heicConversionCache.get(url);
  }

  // 0c. Revisar CacheStorage persistente antes de descargar
  try {
    const cachedBlob = await getCachedConvertedBlob(url);
    if (cachedBlob) {
      const objUrl = URL.createObjectURL(cachedBlob);
      heicConversionCache.set(url, objUrl);
      return objUrl;
    }
  } catch {}

  if (pendingRemoteConversions.has(url)) {
    return await pendingRemoteConversions.get(url);
  }

  const promise = (async () => {
    try {
      let blob = null;

      // 1. Si es Firebase Storage y estamos en navegador, usar getBlob con timeout
      const lower = url.toLowerCase();
      const isFirebase = lower.includes('firebasestorage.googleapis.com') || lower.includes('firebasestorage.app');
      if (isFirebase && storage && typeof window !== 'undefined') {
        try {
          const path = extractFirebaseStoragePath(url);
          const storageRef = path ? ref(storage, path) : ref(storage, url);
          const fbPromise = getBlob(storageRef);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firebase getBlob timeout')), 10000)
          );
          blob = await Promise.race([fbPromise, timeoutPromise]);
        } catch (fbErr) {
          console.warn('Firebase getBlob en heicConverter falló, intentando fetch:', fbErr);
        }
      }

      // 2. Si no es Firebase o getBlob falló, intentar fetch directo con timeout
      if (!blob) {
        try {
          const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const fetchTimeout = controller ? setTimeout(() => controller.abort(), 10000) : null;
          const response = await fetch(url, { 
            cache: 'no-store',
            signal: controller?.signal
          });
          if (fetchTimeout) clearTimeout(fetchTimeout);
          if (response.ok) {
            blob = await response.blob();
          }
        } catch (fetchErr) {
          console.warn('Direct fetch en heicConverter falló:', fetchErr);
        }
      }

      // 3. Fallback con XMLHttpRequest si fetch fue interceptado por extensiones
      if (!blob && typeof XMLHttpRequest !== 'undefined') {
        try {
          blob = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'blob';
            xhr.timeout = 10000;
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
                resolve(xhr.response);
              } else {
                reject(new Error(`XHR status ${xhr.status}`));
              }
            };
            xhr.onerror = () => reject(new Error('XHR network error'));
            xhr.ontimeout = () => reject(new Error('XHR timeout'));
            xhr.send();
          });
        } catch (xhrErr) {
          console.warn('XHR fallback en heicConverter falló:', xhrErr);
        }
      }

      if (!blob) return url;

      const isHeic = isHeicFile(blob) || isHeicUrl(url) || (await isHeicBlobAsync(blob));

      if (isHeic) {
        const convertedBlob = await convertHeicToJpeg(blob, 0.88);
        if (convertedBlob && convertedBlob.size > 0) {
          storeConvertedBlobInCache(url, convertedBlob).catch(() => {});
          const objectUrl = URL.createObjectURL(convertedBlob);
          heicConversionCache.set(url, objectUrl);
          return objectUrl;
        }
        return null;
      }

      // Si no es HEIC pero obtuvimos el blob con éxito:
      const objectUrl = URL.createObjectURL(blob);
      heicConversionCache.set(url, objectUrl);
      return objectUrl;
    } catch (err) {
      console.warn('No se pudo convertir URL remota de HEIC al vuelo:', err);
      return url;
    } finally {
      pendingRemoteConversions.delete(url);
    }
  })();

  pendingRemoteConversions.set(url, promise);
  return await promise;
};

/**
 * Hook para consumir una imagen asegurando compatibilidad en cualquier pantalla
 */
export const useUniversalImageUrl = (src) => {
  const initialKnown = typeof src === 'string' 
    ? (getKnownConvertedUrl(src) || (heicConversionCache.has(src) ? heicConversionCache.get(src) : null)) 
    : null;

  const [displaySrc, setDisplaySrc] = useState(() => {
    if (initialKnown) return initialKnown;
    if (typeof src === 'string' && isHeicUrl(src)) {
      return ''; // No cargar URL .heic cruda en <img> para no provocar onError prematuro
    }
    return src;
  });

  const [isConverting, setIsConverting] = useState(() => {
    if (initialKnown) return false;
    return typeof src === 'string' && isHeicUrl(src);
  });

  const [hasError, setHasError] = useState(false);

  // Safety timer: máximo 6s de conversión antes de liberar UI hacia fallback
  useEffect(() => {
    if (isConverting) {
      const timer = setTimeout(() => {
        setIsConverting(false);
        setHasError(true);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [isConverting]);

  useEffect(() => {
    let isMounted = true;
    if (!src || typeof src !== 'string') {
      setDisplaySrc(src);
      setIsConverting(false);
      setHasError(false);
      return;
    }

    const knownUrl = getKnownConvertedUrl(src);
    if (knownUrl) {
      setDisplaySrc(knownUrl);
      setIsConverting(false);
      setHasError(false);
      return;
    }

    if (heicConversionCache.has(src)) {
      setDisplaySrc(heicConversionCache.get(src));
      setIsConverting(false);
      setHasError(false);
      return;
    }

    // Revisar CacheStorage asíncrono
    getCachedConvertedBlob(src)
      .then((cached) => {
        if (!isMounted) return;
        if (cached) {
          const obj = URL.createObjectURL(cached);
          heicConversionCache.set(src, obj);
          setDisplaySrc(obj);
          setIsConverting(false);
          setHasError(false);
        } else if (isHeicUrl(src)) {
          // Solo si no estaba en CacheStorage y es HEIC, disparar conversión remota
          setIsConverting(true);
          resolveHeicUrlToDisplayable(src)
            .then((resolved) => {
              if (isMounted) {
                if (resolved && (resolved.startsWith('blob:') || resolved.startsWith('https://') || resolved.startsWith('http://'))) {
                  setDisplaySrc(resolved);
                  setIsConverting(false);
                  setHasError(false);
                } else {
                  setIsConverting(false);
                  setHasError(true);
                }
              }
            })
            .catch(() => {
              if (isMounted) {
                setIsConverting(false);
                setHasError(true);
              }
            });
        }
      })
      .catch(() => {});

    if (!isHeicUrl(src)) {
      setDisplaySrc(src);
      setIsConverting(false);
      setHasError(false);
    }

    return () => {
      isMounted = false;
    };
  }, [src]);

  const handleNativeError = async () => {
    if (!src || hasError) return;

    // Si falló un blob local roto, invalidar y mostrar fallback
    if (displaySrc?.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(displaySrc);
      } catch {}
      setIsConverting(false);
      setHasError(true);
      return;
    }

    // Si falló la URL remota nativa (p. ej. foto HEIC guardada con extensión .jpg), convertir
    setIsConverting(true);
    try {
      const resolved = await resolveHeicUrlToDisplayable(src);
      if (resolved && resolved !== src && (resolved.startsWith('blob:') || resolved.startsWith('https://') || resolved.startsWith('http://'))) {
        setDisplaySrc(resolved);
        setIsConverting(false);
        setHasError(false);
        return;
      }
    } catch {
      // Falló la conversión
    }
    setIsConverting(false);
    setHasError(true);
  };

  return { displaySrc, isConverting, hasError, handleNativeError };
};
