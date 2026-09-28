// src/utils/pdfExtractor.js
import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker de pdfjs
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF.js worker setup fallback:', e);
  }
}

/**
 * Extrae todo el texto contenido en un archivo PDF página por página.
 * @param {File | Blob | ArrayBuffer} fileOrBuffer 
 * @returns {Promise<string>} Texto extraído
 */
export async function extractTextFromPDF(fileOrBuffer) {
  try {
    let arrayBuffer;
    if (fileOrBuffer instanceof File || fileOrBuffer instanceof Blob) {
      arrayBuffer = await fileOrBuffer.arrayBuffer();
    } else {
      arrayBuffer = fileOrBuffer;
    }

    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
      isEvalSupported: false,
    });

    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => ('str' in item ? item.str : ''))
        .join(' ');
      fullText += `\n[PÁGINA ${pageNum}]\n` + pageText + '\n';
    }

    return fullText.trim();
  } catch (error) {
    console.error('Error al extraer texto del PDF:', error);
    throw error;
  }
}
