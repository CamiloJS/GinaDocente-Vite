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
  if (clean.includes('.heic?') || clean.includes('.heif?')) return true;
  if (clean.includes('/heic') || clean.includes('image%2fheic')) return true;
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

/**
 * Convierte un File o Blob HEIC a formato JPEG universal
 */
export const convertHeicToJpeg = async (fileOrBlob, quality = 0.85) => {
  if (!fileOrBlob) return fileOrBlob;
  if (typeof window === 'undefined') return fileOrBlob;

  const isHeic = isHeicFile(fileOrBlob) || (await isHeicBlobAsync(fileOrBlob));
  if (!isHeic) return fileOrBlob;

  // 1. Intentar conversión con la librería heic2any con timeout estricto de 4 segundos
  try {
    const heic2anyModule = await import('heic2any');
    const heic2any = heic2anyModule.default || heic2anyModule;
    const conversionPromise = heic2any({
      blob: fileOrBlob,
      toType: 'image/jpeg',
      quality: Math.min(0.95, Math.max(0.6, Number(quality) || 0.85))
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('heic2any timeout')), 4000)
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

  // 2. Fallback: extraer el preview JPEG incrustado dentro del contenedor HEIC de Apple
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

  // 3. Fallback nativo: si el navegador soporta decodificación de HEIC (Safari en iOS / macOS)
  try {
    const bitmap = await createImageBitmap(fileOrBlob);
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
      if (convertedBlob) {
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
  } catch (nativeErr) {
    console.warn('Fallback nativo de canvas no pudo decodificar el HEIC:', nativeErr);
  }

  return fileOrBlob;
};

// Caché en memoria para evitar reconversión de las mismas URLs remotas
const heicConversionCache = new Map();
const pendingRemoteConversions = new Map();

/**
 * Resuelve una URL (incluso remota o de Firebase Storage) que apunte a un HEIC existente,
 * convirtiéndola al vuelo a un ObjectURL JPEG displayable en cualquier dispositivo.
 */
export const resolveHeicUrlToDisplayable = async (url) => {
  if (!url || typeof url !== 'string' || typeof window === 'undefined') return url;

  if (heicConversionCache.has(url)) {
    return heicConversionCache.get(url);
  }

  if (pendingRemoteConversions.has(url)) {
    return await pendingRemoteConversions.get(url);
  }

  const promise = (async () => {
    try {
      // 0. Enlaces de Google Drive -> convertir a endpoint de imagen directa
      const driveMatch = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/i);
      if (driveMatch && driveMatch[1]) {
        const driveImg = `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
        heicConversionCache.set(url, driveImg);
        return driveImg;
      }

      let blob = null;

      // 1. Si es Firebase Storage y estamos en navegador, usar getBlob con timeout (elude bloqueos de Brave / CORS)
      const lower = url.toLowerCase();
      const isFirebase = lower.includes('firebasestorage.googleapis.com') || lower.includes('firebasestorage.app');
      if (isFirebase && storage && typeof window !== 'undefined') {
        try {
          const path = extractFirebaseStoragePath(url);
          const storageRef = path ? ref(storage, path) : ref(storage, url);
          const fbPromise = getBlob(storageRef);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firebase getBlob timeout')), 6000)
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
          const fetchTimeout = controller ? setTimeout(() => controller.abort(), 6000) : null;
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

      // 3. Fallback con XMLHttpRequest si fetch fue interceptado por Brave Shields / extensiones
      if (!blob && typeof XMLHttpRequest !== 'undefined') {
        try {
          blob = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'blob';
            xhr.timeout = 7000;
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
        const objectUrl = URL.createObjectURL(convertedBlob);
        heicConversionCache.set(url, objectUrl);
        return objectUrl;
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
  const [displaySrc, setDisplaySrc] = useState(() => {
    if (typeof src === 'string' && heicConversionCache.has(src)) {
      return heicConversionCache.get(src);
    }
    return src;
  });
  const [isConverting, setIsConverting] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Safety timer: NUNCA permitir que isConverting se quede pegado por más de 5.5s
  useEffect(() => {
    if (isConverting) {
      const timer = setTimeout(() => {
        setIsConverting(false);
      }, 5500);
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

    if (heicConversionCache.has(src)) {
      setDisplaySrc(heicConversionCache.get(src));
      setIsConverting(false);
      setHasError(false);
      return;
    }

    if (isHeicUrl(src)) {
      setIsConverting(true);
      resolveHeicUrlToDisplayable(src)
        .then((resolved) => {
          if (isMounted) {
            setDisplaySrc(resolved);
            setIsConverting(false);
            setHasError(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setIsConverting(false);
            setHasError(true);
          }
        });
      return;
    }

    setDisplaySrc(src);
    setHasError(false);

    return () => {
      isMounted = false;
    };
  }, [src]);

  const handleNativeError = async () => {
    if (!src || hasError) return;

    // Si falló y aún no habíamos intentado convertirlo, intentamos conversión forzada
    if (!displaySrc?.startsWith('blob:')) {
      setIsConverting(true);
      try {
        const resolved = await resolveHeicUrlToDisplayable(src);
        if (resolved && resolved !== src) {
          setDisplaySrc(resolved);
          setIsConverting(false);
          setHasError(false);
          return;
        }
      } catch {
        // Falló la conversión
      }
      setIsConverting(false);
    }

    setHasError(true);
  };

  return { displaySrc, isConverting, hasError, handleNativeError };
};
