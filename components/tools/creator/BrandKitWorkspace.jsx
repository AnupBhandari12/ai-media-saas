import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import BrandKitForm from "@/components/tools/creator/BrandKitForm";

export default function BrandKitWorkspace({ uploadFolder }) {
  const infoPanel = (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <p className="text-lg font-semibold text-foreground">
        Reusable brand defaults
      </p>

      <p className="mt-3 text-sm leading-7 text-muted">
        Save your brand once. Upcoming creator and video tools can reuse the
        same logo, colors, and watermark settings.
      </p>

      <div className="mt-6 space-y-3">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-semibold text-foreground">
            YouTube Thumbnail
          </p>

          <p className="mt-1 text-xs text-muted">Reuse logo and colors.</p>
        </div>

        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-semibold text-foreground">
            Bulk Watermark
          </p>

          <p className="mt-1 text-xs text-muted">
            Load watermark defaults automatically.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-semibold text-foreground">
            Video Watermark
          </p>

          <p className="mt-1 text-xs text-muted">
            Same branding later in Video Toolbox.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <ToolShell
      toolId="CRT-03"
      title="Brand Kit"
      description="Save your logo, brand colors, and default watermark settings once and reuse them across AI Media."
      result={infoPanel}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.CLOUD} />

      <div className="mt-6">
        <BrandKitForm uploadFolder={uploadFolder} />
      </div>
    </ToolShell>
  );
}
