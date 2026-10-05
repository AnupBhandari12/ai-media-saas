import ToolsHub from "@/components/tools/ToolsHub";

export default function ToolsPage() {
  return (
    <div>
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          AI Media Tools
        </p>

        <h1 className="mt-2 text-3xl font-bold text-foreground">
          Tools for everyday media work
        </h1>

        <p className="mt-3 leading-7 text-muted">
          Search and use practical image, PDF, video,
          audio, document, and AI tools from one
          workspace.
        </p>
      </div>

      <section className="mt-8">
        <ToolsHub />
      </section>
    </div>
  );
}