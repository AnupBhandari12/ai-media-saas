import Link from "next/link";
import EmailReadyWorkspace from "@/components/workflows/EmailReadyWorkspace";

export const metadata = {title: "Email Ready | AI Media",
  description: "Prepare one image attachment locally with approved size presets."};

export default function EmailReadyPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-8 sm:px-6">
      <Link href="/workflows" className="text-sm font-semibold text-primary hover:underline">← Back to Workflows</Link>
      <p className="mt-6 text-xs font-bold uppercase tracking-widest text-primary">Phase 22 • Email image beta</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">Email Ready</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
        Prepare a single photo attachment for email with practical file-size goals. Processing stays in your
        browser. The PDF attachment and batch/ZIP options are not enabled in this beta.
      </p>
      <EmailReadyWorkspace />
    </div>
  );
}
