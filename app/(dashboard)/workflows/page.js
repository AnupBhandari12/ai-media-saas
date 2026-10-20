import WorkflowHub from "@/components/workflows/WorkflowHub";

export const metadata = {
  title: "Ready-For Workflows | AI Media",
  description: "Preview approved media workflows before processing.",
};

export default function WorkflowsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          AI Media • Phase 22
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
          Ready-for workflows
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted sm:text-base">
          Pick a destination instead of guessing file formats. Preview the steps
          that an upcoming workflow will automate using existing AI Media tools.
        </p>
      </div>
      <section aria-label="Workflow catalog" className="mt-8">
        <WorkflowHub />
      </section>
    </main>
  );
}
