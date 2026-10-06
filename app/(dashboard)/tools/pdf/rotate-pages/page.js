import PdfPageOrganizerWorkspace from "@/components/tools/pdf/PdfPageOrganizerWorkspace";

export default function RotatePdfPagesPage() {
    return (
        <PdfPageOrganizerWorkspace
            toolId="PDF-09"
            mode="rotate"
            title="Rotate PDF Pages"
            description="Select one or more PDF pages and rotate them left, right, or 180 degrees."
        />
    );
}