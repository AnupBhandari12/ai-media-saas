import AiWorkspaceUnderstanding from "@/components/ai-workspace/AiWorkspaceUnderstanding";

export const metadata = {
  title: "AI Workspace | AI Media",
  description: "Preview strictly validated media workflow plans before execution.",
};

export default function AiWorkspacePage() {
  return (
    <main className="mx-auto w-full max-w-6xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">AI Media · Phase 23</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">AI Workspace</h1>
      <p className="mb-8 mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base">
        Turn a request into a safe, inspectable workflow plan. Stage 04 reuses the existing Website Ready local processor after an explicit review, file selection and Run click.
        Other approved workflows still run on their existing pages; no remote AI execution or credits here.
      </p>
      <AiWorkspaceUnderstanding />
    </main>
  );
}
