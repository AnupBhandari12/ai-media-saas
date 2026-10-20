import JobFormReadyWorkspace from "@/components/workflows/JobFormReadyWorkspace";

export const metadata = {
  title: "Job & Form Photo Ready | AI Media",
  description: "Prepare exact-dimension JPG photos for online forms locally, with a size goal and honest compliance warnings.",
};

export default function JobFormReadyPage() {
  return (
    <main className="mx-auto w-full max-w-6xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">AI Media • Phase 22</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Job / Form Ready</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base">
        Prepare a photo with chosen pixel dimensions and a file-size goal using existing local tools.
        Always follow the receiving form's exact rules. This does not verify facial, biometric or official ID requirements.
      </p>
      <JobFormReadyWorkspace />
    </main>
  );
}
