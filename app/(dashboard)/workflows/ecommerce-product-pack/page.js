import EcommerceProductPackWorkspace from "@/components/workflows/EcommerceProductPackWorkspace";

export const metadata={title:"E-commerce Product Pack | AI Media",
  description:"Make catalog and web listing product images using local browser tools."};

export default function EcommerceProductPackPage() {
  return (
    <main className="mx-auto w-full max-w-6xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">AI Media • Phase 22</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">E-commerce Product Pack</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base">
        Prepare a square catalog photo, a smaller web listing photo and a simple product metadata note.
        Crop, resize and optional text watermark run in your browser. AI background cleanup,
        marketplace listing and batch uploads are not enabled in this beta.
      </p>
      <EcommerceProductPackWorkspace />
    </main>
  );
}
