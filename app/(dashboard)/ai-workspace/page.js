import AiWorkspaceFoundation from "@/components/ai-workspace/AiWorkspaceFoundation";

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
        Turn a request into a safe, inspectable workflow plan. Stage 01 is a deterministic demonstration;
        natural-language AI interpretation and execution will be added in later stages.
      </p>
      <AiWorkspaceFoundation />
    </main>
  );
}
