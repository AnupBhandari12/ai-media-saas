import {
  CheckCircle2,
  FileOutput,
} from "lucide-react";

export default function ResultPanel({
  title = "Result ready",
  description = "Your processed file is ready.",
  children,
  metadata = [],
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CheckCircle2 size={19} />
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-foreground">
            {title}
          </p>

          <p className="mt-1 text-sm leading-6 text-muted">
            {description}
          </p>
        </div>
      </div>

      {children && (
        <div className="mt-5 overflow-hidden rounded-xl border border-border bg-background">
          {children}
        </div>
      )}

      {metadata.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {metadata.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-border bg-background p-3"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {item.label}
              </p>

              <p className="mt-1 wrap-break-word text-sm font-semibold text-foreground">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center gap-2 text-xs text-muted">
        <FileOutput size={15} />

        <span>
          Review the output before downloading or saving it.
        </span>
      </div>
    </div>
  );
}