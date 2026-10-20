import LinkedInReadyWorkspace from "@/components/workflows/LinkedInReadyWorkspace";

export const metadata = {
  title: "LinkedIn Ready | AI Media",
  description: "Resize, convert and compress a LinkedIn post image in your browser.",
};

export default function LinkedInReadyPage() {
  return (
    <main className="mx-auto w-full max-w-6xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">AI Media • Phase 22</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">LinkedIn Ready</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base">
        Prepare a LinkedIn post photo using resize, JPG conversion and compression.
        Presets set maximum image dimensions while keeping the original aspect ratio.
        No automatic posting or LinkedIn account access is enabled. Profile photos remain a separate preview-only variant.
      </p>
      <LinkedInReadyWorkspace />
    </main>
  );
}
