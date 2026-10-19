// src/utils/heicConverter.js
// Soporte universal para imágenes HEIC/HEIF (iPhone / iOS) en todos los navegadores y dispositivos
// (Windows 7/10/11, Android, iOS, macOS, Linux).

import { useState, useEffect } from 'react';

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
 * Convierte un File o Blob HEIC a formato JPEG universal
 */
export const convertHeicToJpeg = async (fileOrBlob, quality = 0.85) => {
  if (!fileOrBlob) return fileOrBlob;
  if (typeof window === 'undefined') return fileOrBlob;

  const isHeic = isHeicFile(fileOrBlob) || (await isHeicBlobAsync(fileOrBlob));
  if (!isHeic) return fileOrBlob;

  // 1. Intentar conversión con la librería heic2any (WebAssembly/Worker)
  try {
    const heic2anyModule = await import('heic2any');
    const heic2any = heic2anyModule.default || heic2anyModule;
    const result = await heic2any({
      blob: fileOrBlob,
      toType: 'image/jpeg',
      quality: Math.min(0.95, Math.max(0.6, Number(quality) || 0.85))
    });
    const jpegBlob = Array.isArray(result) ? result[0] : result;
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
  } catch (err) {
    console.warn('Conversión heic2any no disponible o falló, intentando decodificador nativo:', err);
  }

  // 2. Fallback nativo: si el navegador soporta decodificación de HEIC (Safari en iOS / macOS)
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
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) return url;
      const blob = await response.blob();
      const isHeic = isHeicFile(blob) || isHeicUrl(url) || (await isHeicBlobAsync(blob));

      if (!isHeic) {
        heicConversionCache.set(url, url);
        return url;
      }

      const convertedBlob = await convertHeicToJpeg(blob, 0.88);
      const objectUrl = URL.createObjectURL(convertedBlob);
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
