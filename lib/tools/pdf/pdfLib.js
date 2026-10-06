let pdfLibPromise = null;

export async function loadPdfLib() {
  if (!pdfLibPromise) {
    pdfLibPromise = import("pdf-lib");
  }

  return pdfLibPromise;
}