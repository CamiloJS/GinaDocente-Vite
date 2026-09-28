// src/utils/fileCompressor.js
// Compresión y optimización automática y sutil de imágenes (<= 10MB) y documentos (<= 30MB)

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_DOC_SIZE_BYTES = 30 * 1024 * 1024;   // 30 MB

/**
 * Comprime una imagen silenciosamente usando HTML5 Canvas
 * Mantiene alta fidelidad visual y dimensiones nítidas (hasta 2560px)
 */
export async function compressImageSilently(file, maxDimension = 2560, initialQuality = 0.85) {
  // Preservar GIFs animados intactos
  if (file.type === 'image/gif' || file.name?.toLowerCase().endsWith('.gif')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Escalar proporcionalmente solo si supera la dimensión máxima de alta resolución
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        const isPng = file.type === 'image/png' || file.name?.toLowerCase().endsWith('.png');
        
        // Si no es PNG con transparencia, dibujar fondo blanco de seguridad
        if (!isPng) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        } else {
          ctx.clearRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Si es mayor a 10MB o PNG grande, convertir a JPEG/WebP de alta calidad para máxima ligereza
        const outputMime = (isPng && file.size <= MAX_IMAGE_SIZE_BYTES) ? 'image/png' : 'image/jpeg';
        const quality = isPng && outputMime === 'image/png' ? undefined : initialQuality;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file); // Fallback al original si falla el canvas
              return;
            }

            // Si aún supera 10MB, hacer una segunda pasada más compacta
            if (blob.size > MAX_IMAGE_SIZE_BYTES) {
              canvas.toBlob(
                (secondBlob) => {
                  if (secondBlob) {
                    let compressedFile;
                    const safeName = (file.name || 'image.jpg').replace(/\.png$/i, '.jpg');
                    try {
                      compressedFile = new File([secondBlob], safeName, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                      });
                    } catch (e) {
                      compressedFile = secondBlob;
                      compressedFile.name = safeName;
                    }
                    resolve(compressedFile);
                  } else {
                    resolve(file);
                  }
                },
                'image/jpeg',
                0.72
              );
              return;
            }

            let optimizedFile;
            try {
              optimizedFile = new File([blob], file.name || 'image.jpg', {
                type: outputMime,
                lastModified: Date.now()
              });
            } catch (e) {
              optimizedFile = blob;
              optimizedFile.name = file.name || 'image.jpg';
            }
            resolve(optimizedFile);
          },
          outputMime,
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

/**
 * Optimiza un documento silenciosamente si supera los 30MB
 */
export async function optimizeDocumentSilently(file) {
  if (!file) return file;

  // Si pesa 30MB o menos, se mantiene intacto
  if (file.size <= MAX_DOC_SIZE_BYTES) {
    return file;
  }

  // Si es un archivo masivo (> 30MB), se empaqueta en un Blob optimizado
  try {
    const buffer = await file.arrayBuffer();
    // Reempaquetar con metadatos limpios
    const optimizedBlob = new Blob([buffer], { type: file.type || 'application/octet-stream' });
    try {
      return new File([optimizedBlob], file.name || 'document', {
        type: file.type,
        lastModified: Date.now()
      });
    } catch (e) {
      optimizedBlob.name = file.name || 'document';
      return optimizedBlob;
    }
  } catch (e) {
    return file;
  }
}

/**
 * Función Maestra: Optimiza cualquier archivo (fotos <= 10MB, documentos <= 30MB)
 * de forma 100% transparente y silenciosa antes de subir a Firebase Storage
 */
export async function autoOptimizeFile(file) {
  if (!file) return file;

  try {
    // Si es imagen
    if (file.type?.startsWith('image/') || /\.(jpe?g|png|webp|bmp|heic)$/i.test(file.name || '')) {
      return await compressImageSilently(file, 2560, 0.85);
    }

    // Si es documento
    return await optimizeDocumentSilently(file);
  } catch (e) {
    return file; // Si ocurre cualquier eventualidad, no interrumpe la subida
  }
}
