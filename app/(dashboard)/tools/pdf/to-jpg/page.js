import PdfToImageWorkspace from "@/components/tools/pdf/PdfToImageWorkspace";

export default function PdfToJpgPage() {
    return (
        <PdfToImageWorkspace
            toolId="PDF-02"
            format="jpg"
            title="PDF to JPG"
            description="Convert selected or all PDF pages into JPG images with adjustable render quality and ZIP download."
        />
    );
}