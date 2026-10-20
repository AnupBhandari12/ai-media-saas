import StudentNotesPackWorkspace from "@/components/workflows/StudentNotesPackWorkspace";

export const metadata={title:"Student Notes Pack | AI Media",
  description:"Combine ordered study photos into a numbered PDF with a source-page index in your browser."};

export default function StudentNotesPackPage() {
  return (
    <main className="mx-auto w-full max-w-6xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">AI Media • Phase 22</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Student Notes Pack</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base">
        Put your handwritten or printed class-note photos in order, make a numbered PDF,
        and download a page-to-photo source index. All PDF operations run locally in your browser.
        OCR, audio transcription and AI summaries are not part of this beta.
      </p>
      <StudentNotesPackWorkspace />
    </main>
  );
}
