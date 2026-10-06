import PdfToImageWorkspace from "@/components/tools/pdf/PdfToImageWorkspace";

export default function PdfToPngPage() {
    return (
        <PdfToImageWorkspace
            toolId="PDF-03"
            format="png"
            title="PDF to PNG"
            description="Render selected PDF pages as high-quality PNG images with individual and ZIP downloads."
        />
    );
}