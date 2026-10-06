let pdfJsPromise = null;

export async function loadPdfJs() {
    if (typeof window === "undefined") {
        throw new Error(
            "PDF.js rendering is only available in the browser."
        );
    }

    if (!pdfJsPromise) {
        pdfJsPromise = import(
            "pdfjs-dist/build/pdf.mjs"
        ).then((pdfjs) => {
            pdfjs.GlobalWorkerOptions.workerSrc =
                "/pdf.worker.min.mjs";

            return pdfjs;
        });
    }

    return pdfJsPromise;
}