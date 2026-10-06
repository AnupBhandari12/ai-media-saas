import PdfPageOrganizerWorkspace from "@/components/tools/pdf/PdfPageOrganizerWorkspace";

export default function DeletePdfPagesPage() {
    return (
        <PdfPageOrganizerWorkspace
            toolId="PDF-07"
            mode="delete"
            title="Delete PDF Pages"
            description="Preview your PDF, select unwanted pages, and create a new PDF without them."
        />
    );
}