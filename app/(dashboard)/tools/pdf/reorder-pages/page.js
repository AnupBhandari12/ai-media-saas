import PdfPageOrganizerWorkspace from "@/components/tools/pdf/PdfPageOrganizerWorkspace";

export default function ReorderPdfPagesPage() {
    return (
        <PdfPageOrganizerWorkspace
            toolId="PDF-08"
            mode="reorder"
            title="Reorder PDF Pages"
            description="Preview PDF pages and move them into the exact order you need."
        />
    );
}