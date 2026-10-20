import AiWorkspaceUnderstanding from "@/components/ai-workspace/AiWorkspaceUnderstanding";

export const metadata = {
  title: "AI Workspace | AI Media",
  description: "Preview strictly validated media workflow plans before execution.",
};

export default function AiWorkspacePage() {
  const realAiEnabled = process.env.AI_WORKSPACE_PLANNER_ENABLED === "true" &&
    process.env.AI_REAL_SPEND_APPROVED === "true" &&
    typeof process.env.OPENAI_API_KEY === "string" && process.env.OPENAI_API_KEY.startsWith("sk-");
  return (
    <main className="mx-auto w-full max-w-6xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">AI Media · Phase 23</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">AI Workspace</h1>
      <p className="mb-8 mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base">
        Describe one supported photo or photos-to-PDF output, preview its registered steps, and review before acting.
        Website Ready can run locally after your explicit acknowledgment, file selection and Run click; other workflows open on their existing pages.
        Saving plan history is optional. Paid text-only AI planning stays disabled by default and requires separate consent and server-side budget controls.
      </p>
      <AiWorkspaceUnderstanding realAiEnabled={realAiEnabled} />
    </main>
  );
}
