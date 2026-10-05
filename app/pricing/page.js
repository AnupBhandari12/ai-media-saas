import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-6 py-20">
      <div className="w-full rounded-3xl border border-border bg-surface p-8 text-center sm:p-12">
        <span className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
          Free Public Beta
        </span>

        <h1 className="mt-6 text-3xl font-bold text-foreground sm:text-4xl">
          AI Media is currently free during beta
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-muted">
          You can use the Image Studio, Video Studio, and Media Library
          during the beta period with fair-use monthly limits.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-background p-6">
          <p className="font-semibold text-foreground">
            Free Beta
          </p>

          <p className="mt-3 text-sm text-muted">
            30 image uploads per month · 10 video uploads per month
          </p>

          <p className="mt-2 text-sm text-muted">
            Paid plans will be introduced later.
          </p>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/sign-up"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            Start Free
          </Link>

          <Link
            href="/"
            className="rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-background"
          >
            Back Home
          </Link>
        </div>
      </div>
    </main>
  );
}