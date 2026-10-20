import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import WebsiteReadyWorkspace from "@/components/workflows/WebsiteReadyWorkspace";

export const metadata = {
  title: "Website Ready | AI Media",
  description: "Resize, convert, strip common image metadata and compress locally for a website.",
};

export default function WebsiteReadyPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/workflows" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft size={17} aria-hidden="true" /> Back to Workflows
      </Link>
      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-primary">WF-06 • Browser-local beta</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">Website Ready</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
        Prepare a web-friendly image in one guided run. Processing stays in your browser; files are not uploaded or saved to your Media Library.
      </p>
      <WebsiteReadyWorkspace />
    </div>
  );
}
