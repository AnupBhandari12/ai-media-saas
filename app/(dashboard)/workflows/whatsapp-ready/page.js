import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import WhatsAppReadyWorkspace from "@/components/workflows/WhatsAppReadyWorkspace";

export const metadata = {
  title: "WhatsApp Ready | AI Media",
  description: "Make a JPG photo easier to share on WhatsApp. Process locally and download.",
};

export default function WhatsAppReadyPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/workflows" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft size={17} aria-hidden="true" /> Back to Workflows
      </Link>
      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-primary">WF-01 • Photo-only browser beta</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">WhatsApp Ready</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
        Make one photo easier to share in two guided steps: compatible format, then practical compression.
        Files stay on your device. Videos are still preview-only.
      </p>
      <WhatsAppReadyWorkspace />
    </div>
  );
}
