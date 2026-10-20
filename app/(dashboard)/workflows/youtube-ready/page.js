import YouTubeReadyWorkspace from "@/components/workflows/YouTubeReadyWorkspace";

export const metadata = {
  title: "YouTube Ready | AI Media",
  description: "Create and optimize YouTube thumbnail images locally in your browser.",
};

export default function YouTubeReadyPage() {
  return (
    <main className="mx-auto w-full max-w-6xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">AI Media • Phase 22</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">YouTube Ready</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base">
        Prepare a 1280 × 720 JPG thumbnail using the existing Thumbnail Maker and target-size image compressor.
        All processing stays in the browser. YouTube upload, account access and video processing remain unavailable here.
      </p>
      <YouTubeReadyWorkspace />
    </main>
  );
}
