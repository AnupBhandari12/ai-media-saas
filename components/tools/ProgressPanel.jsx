import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Loader2,
} from "lucide-react";

const statusConfig = {
  IDLE: {
    label: "Ready",
    icon: Clock3,
  },

  PROCESSING: {
    label: "Processing",
    icon: Loader2,
  },

  SUCCESS: {
    label: "Completed",
    icon: CheckCircle2,
  },

  ERROR: {
    label: "Failed",
    icon: CircleAlert,
  },
};

export default function ProgressPanel({
  status = "IDLE",
  progress = 0,
  message = "Ready to process your file.",
}) {
  const config =
    statusConfig[status] || statusConfig.IDLE;

  const Icon = config.icon;

  const safeProgress = Math.min(
    100,
    Math.max(0, Number(progress) || 0)
  );

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon
            size={19}
            className={
              status === "PROCESSING"
                ? "animate-spin"
                : ""
            }
          />
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-foreground">
            {config.label}
          </p>

          <p className="mt-1 text-sm text-muted">
            {message}
          </p>
        </div>
      </div>

      {status === "PROCESSING" && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs text-muted">
            <span>Progress</span>
            <span>{Math.round(safeProgress)}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{
                width: `${safeProgress}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}