import {
  Cloud,
  HardDrive,
  ServerCog,
  Sparkles,
} from "lucide-react";

export const PROCESSING_MODES = {
  LOCAL: "LOCAL",
  CLOUD: "CLOUD",
  WORKER: "WORKER",
  AI: "AI",
};

const modeConfig = {
  LOCAL: {
    label: "Local",
    description: "Processed on your device",
    icon: HardDrive,
  },

  CLOUD: {
    label: "Cloud",
    description: "Processed using secure cloud services",
    icon: Cloud,
  },

  WORKER: {
    label: "Worker",
    description: "Processed by a dedicated server worker",
    icon: ServerCog,
  },

  AI: {
    label: "AI",
    description: "Uses an AI processing service",
    icon: Sparkles,
  },
};

export default function ProcessingModeBadge({
  mode = PROCESSING_MODES.LOCAL,
  showDescription = true,
}) {
  const config =
    modeConfig[mode] || modeConfig.LOCAL;

  const Icon = config.icon;

  return (
    <div className="inline-flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon size={17} />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
          {config.label}
        </p>

        {showDescription && (
          <p className="mt-0.5 text-xs text-muted">
            {config.description}
          </p>
        )}
      </div>
    </div>
  );
}