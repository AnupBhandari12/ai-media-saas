import InstagramReadyWorkspace from "@/components/workflows/InstagramReadyWorkspace";

export const metadata = {
  title: "Instagram Image Ready | AI Media",
  description: "Prepare an Instagram post or story image with safe crop and browser-only processing.",
};

export default function InstagramReadyPage() {
  return (
    <main className="mx-auto w-full max-w-6xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">AI Media • Phase 22</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Instagram Ready</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base">
        Prepare one square post, portrait post or story image using the existing browser tools.
        Choose a layout, preview an approximate crop, then review and download the finished file.
        Reels and video output are not enabled in this stage.
      </p>
      <InstagramReadyWorkspace />
    </main>
  );
}
