// src/utils/pdfExtractor.js
// La libreria de PDF se carga SOLO cuando se va a leer un PDF (no en la carga inicial).

import {
  ensurePdfWorker,
  ensurePdfInProcessWorkerFallback,
  buildPdfDocumentInitParams
} from './flipbookEngine.js';

/**
 * Extrae todo el texto contenido en un archivo PDF pagina por pagina.
 * @param {File | Blob | ArrayBuffer | Uint8Array} fileOrBuffer
 * @returns {Promise<string>} Texto extraido
 */
export async function extractTextFromPDF(fileOrBuffer) {
  let pdf = null;
  try {
    const mod = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdfjsLib = mod.default || mod;

    // Configurar worker de pdfjs compatible con la version instalada
    if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
      try {
        ensurePdfWorker(pdfjsLib);
      } catch (e) {
        console.warn('PDF.js worker setup fallback:', e);
      }
    }

    let arrayBuffer;
    if (fileOrBuffer && typeof fileOrBuffer.arrayBuffer === 'function') {
      arrayBuffer = await fileOrBuffer.arrayBuffer();
    } else {
      arrayBuffer = fileOrBuffer;
    }

    try {
      const loadingTask = pdfjsLib.getDocument(
        buildPdfDocumentInitParams({ data: arrayBuffer }, pdfjsLib)
      );
      pdf = await loadingTask.promise;
    } catch {
      await ensurePdfInProcessWorkerFallback(pdfjsLib);
      const retryTask = pdfjsLib.getDocument(
        buildPdfDocumentInitParams(
          { data: arrayBuffer },
          pdfjsLib,
          { disableAutoFetch: true, disableFontFace: true, useSystemFonts: false }
        )
      );
      pdf = await retryTask.promise;
    }

    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = (textContent?.items || [])
        .map(item => (item && 'str' in item ? item.str : ''))
        .join(' ');
      fullText += `\n[PAGINA ${pageNum}]\n` + pageText + '\n';
      try {
        page.cleanup?.();
      } catch {
        // Ignore cleanup errors
      }
    }

    return fullText.trim();
  } catch (error) {
    console.error('Error al extraer texto del PDF:', error);
    throw error;
  } finally {
    try {
      await pdf?.destroy?.();
    } catch {
      // Ignore destroy errors
    }
  }
}
