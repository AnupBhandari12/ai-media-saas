import FacebookReadyWorkspace from "@/components/workflows/FacebookReadyWorkspace";

export const metadata = {
  title: "Facebook Image Ready | AI Media",
  description: "Prepare a Facebook feed or page-cover image with safe crop and browser-only processing.",
};

export default function FacebookReadyPage() {
  return (
    <main className="mx-auto w-full max-w-6xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">AI Media • Phase 22</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Facebook Ready</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base">
        Prepare a square feed image, landscape feed image or page-cover draft using the existing browser tools.
        Choose a layout, preview an approximate crop, then review and download the finished file.
        No video publishing or Facebook account access is enabled. Cover appearance varies by device.
      </p>
      <FacebookReadyWorkspace />
    </main>
  );
}
