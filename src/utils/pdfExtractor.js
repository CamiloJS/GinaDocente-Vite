// src/utils/pdfExtractor.js
// La libreria de PDF se carga SOLO cuando se va a leer un PDF (no en la carga inicial).

/**
 * Extrae todo el texto contenido en un archivo PDF pagina por pagina.
 * @param {File | Blob | ArrayBuffer} fileOrBuffer
 * @returns {Promise<string>} Texto extraido
 */
export async function extractTextFromPDF(fileOrBuffer) {
  try {
    const pdfjsLib = await import('pdfjs-dist');

    // Configurar worker de pdfjs (una sola vez)
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
      } catch (e) {
        console.warn('PDF.js worker setup fallback:', e);
      }
    }

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
      fullText += `\n[PAGINA ${pageNum}]\n` + pageText + '\n';
    }

    return fullText.trim();
  } catch (error) {
    console.error('Error al extraer texto del PDF:', error);
    throw error;
  }
}
