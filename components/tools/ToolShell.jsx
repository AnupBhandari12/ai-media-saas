import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ToolShell({
  toolId,
  title,
  description,
  children,
  result,
}) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Link
        href="/tools"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted transition hover:text-foreground"
      >
        <ArrowLeft size={17} />
        Back to Tools
      </Link>

      <div className="mt-5 max-w-3xl">
        {toolId && (
          <span className="inline-flex rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {toolId}
          </span>
        )}

        <h1 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
          {title}
        </h1>

        <p className="mt-3 text-sm leading-7 text-muted sm:text-base">
          {description}
        </p>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
        <section className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          {children}
        </section>

        <aside className="min-w-0">
          {result || (
            <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
              <div>
                <p className="font-semibold text-foreground">
                  Your result will appear here
                </p>

                <p className="mt-2 text-sm leading-6 text-muted">
                  Add a file and run the tool to preview the processed output.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
