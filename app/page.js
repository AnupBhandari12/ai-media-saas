import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { tools, TOOL_STATUS } from "@/lib/tools/registry";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />


      <section className="px-6 py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-secondary" />

              <span className="text-xs font-semibold text-foreground">
                Free Beta · Professional everyday tools
              </span>
            </div>

            <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-primary">
              Media + PDF + document toolbox
            </p>

            <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Upload once.
              <span className="block text-primary">
                Make it ready for anything.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              Prepare images, videos, PDFs, audio, documents, and creator assets
              from one simple workspace. Use fast everyday tools without jumping
              between different websites.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="rounded-lg bg-primary px-6 py-3 text-center font-semibold text-white transition hover:bg-primary-hover"
              >
                Start Free
              </Link>

              <a
                href="#tools"
                className="rounded-lg border border-border bg-surface px-6 py-3 text-center font-semibold text-foreground transition hover:bg-slate-50"
              >
                Explore Tools
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
              <span>No credit card</span>
              <span>•</span>
              <span>Mobile friendly</span>
              <span>•</span>
              <span>Browser-first where possible</span>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  AI Media Workspace
                </p>

                <p className="mt-1 text-sm text-muted">
                  One place for everyday file work
                </p>
              </div>

              <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                Free Beta
              </span>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-background p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Available now
              </p>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Image Studio
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      Upload · Smart crop · Presets · Download
                    </p>
                  </div>

                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    Live
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Video Studio
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      Upload · Optimize · Preview · Download
                    </p>
                  </div>

                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    Live
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Media Library
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      Private files · Filters · Download · Delete
                    </p>
                  </div>

                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    Live
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-dashed border-border p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Expanding next
                  </p>

                  <p className="mt-2 text-sm font-medium leading-6 text-foreground">
                    Image utilities · PDF tools · Audio · Creator tools · AI workflows
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section
        id="features"
        className="border-t border-border bg-surface px-6 py-20 sm:py-24"
      >
        <div id="tools" className="mx-auto max-w-7xl scroll-mt-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Your everyday toolbox
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Start with what works today. More tools are on the way.
            </h2>

            <p className="mt-4 text-lg leading-8 text-muted">
              Use the tools already live in AI Media, and see what we are building
              next across images, PDFs, video, audio, creator work, and AI.
            </p>
          </div>

          {/* Available now */}
          <div className="mt-12">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Available Now
                </p>

                <p className="mt-1 text-sm text-muted">
                  Working and tested in the current product.
                </p>
              </div>

              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Live
              </span>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <Link
                href="/studio/image"
                className="group rounded-2xl border border-border bg-background p-6 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Image
                  </span>

                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    Live
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-semibold text-foreground">
                  Image Studio
                </h3>

                <p className="mt-3 text-sm leading-6 text-muted">
                  Upload images, apply social-ready presets, use smart cropping,
                  preview results, and download optimized files.
                </p>

                <p className="mt-6 text-sm font-semibold text-primary">
                  Open Image Studio →
                </p>
              </Link>

              <Link
                href="/studio/video"
                className="group rounded-2xl border border-border bg-background p-6 transition hover:border-secondary/40 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                    Video
                  </span>

                  <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">
                    Live
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-semibold text-foreground">
                  Video Studio
                </h3>

                <p className="mt-3 text-sm leading-6 text-muted">
                  Upload videos, optimize delivery, generate previews, and download
                  processed media from one workspace.
                </p>

                <p className="mt-6 text-sm font-semibold text-secondary">
                  Open Video Studio →
                </p>
              </Link>

              <Link
                href="/library"
                className="group rounded-2xl border border-border bg-background p-6 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Workspace
                  </span>

                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    Live
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-semibold text-foreground">
                  Media Library
                </h3>

                <p className="mt-3 text-sm leading-6 text-muted">
                  View your private uploaded media, filter files, open results,
                  download them, or remove files you no longer need.
                </p>

                <p className="mt-6 text-sm font-semibold text-primary">
                  Open Library →
                </p>
              </Link>
            </div>
          </div>

          {/* Popular tools */}
          <div className="mt-16">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Popular Tools
                </p>

                <p className="mt-1 text-sm text-muted">
                  Daily-use tools being added to the AI Media toolbox.
                </p>
              </div>

              <Link
                href="/tools"
                className="text-sm font-semibold text-primary transition hover:text-primary-hover"
              >
                View all tools →
              </Link>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tools.slice(0, 6).map((tool) => {
                const isAvailable = tool.status === TOOL_STATUS.AVAILABLE;

                const content = (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-muted">
                        {tool.id}
                      </span>

                      <span
                        className={
                          isAvailable
                            ? "rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                            : "rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-muted"
                        }
                      >
                        {isAvailable ? "Available" : "Coming Soon"}
                      </span>
                    </div>

                    <h3 className="mt-4 font-semibold text-foreground">
                      {tool.name}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-muted">
                      {tool.description}
                    </p>

                    <p
                      className={`mt-5 text-sm font-semibold ${isAvailable ? "text-primary" : "text-muted"
                        }`}
                    >
                      {isAvailable ? "Open Tool →" : "In development"}
                    </p>
                  </>
                );

                if (isAvailable) {
                  return (
                    <Link
                      key={tool.id}
                      href={tool.route}
                      className="rounded-2xl border border-border bg-background p-5 transition hover:border-primary/40 hover:shadow-sm"
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <article
                    key={tool.id}
                    className="cursor-not-allowed rounded-2xl border border-border bg-background p-5 opacity-80"
                  >
                    {content}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>


      <section id="how-it-works" className="px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              One workspace, many jobs
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Tools organized around the work you actually need to finish.
            </h2>

            <p className="mt-4 text-lg leading-8 text-muted">
              AI Media is growing beyond image and video editing into a practical
              toolbox for files, documents, creator work, and AI-assisted workflows.
            </p>
          </div>

          {/* Categories */}
          <div className="mt-12">
            <p className="text-sm font-semibold text-foreground">
              Tool Categories
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  name: "Image",
                  description: "Compress, resize, convert, crop, rotate, and prepare photos.",
                  status: "Building",
                },
                {
                  name: "PDF",
                  description: "Merge, split, compress, convert, organize, and prepare PDFs.",
                  status: "Coming Soon",
                },
                {
                  name: "Video",
                  description: "Optimize, compress, preview, and prepare videos for sharing.",
                  status: "Live + Expanding",
                },
                {
                  name: "Audio",
                  description: "Convert, compress, extract, and prepare audio files.",
                  status: "Coming Soon",
                },
                {
                  name: "Creator",
                  description: "Watermarks, social assets, brand-ready exports, and creator tools.",
                  status: "Coming Soon",
                },
                {
                  name: "Utility",
                  description: "QR, metadata, OCR, file helpers, and everyday utilities.",
                  status: "Coming Soon",
                },
                {
                  name: "AI",
                  description: "AI-assisted media, captions, document help, and smart workflows.",
                  status: "Coming Soon",
                },
                {
                  name: "Workspace",
                  description: "Keep your source files and generated results organized together.",
                  status: "Live",
                },
              ].map((category) => (
                <article
                  key={category.name}
                  className="rounded-2xl border border-border bg-surface p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-foreground">
                      {category.name}
                    </h3>

                    <span className="shrink-0 rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-muted">
                      {category.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-muted">
                    {category.description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          {/* Ready for */}
          <div className="mt-16 rounded-3xl border border-border bg-surface p-6 sm:p-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                  Ready for real life
                </p>

                <h3 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Prepare one file for wherever it needs to go next.
                </h3>

                <p className="mt-4 leading-7 text-muted">
                  Instead of learning different apps for every task, AI Media will
                  help you prepare files for common destinations and requirements.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "WhatsApp sharing",
                  "Instagram & social media",
                  "Website upload",
                  "Email attachment",
                  "Job application",
                  "College / online forms",
                  "YouTube publishing",
                  "E-commerce listings",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      ✓
                    </span>

                    <span className="text-sm font-medium text-foreground">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>



      <section className="px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="overflow-hidden rounded-3xl bg-foreground px-6 py-12 sm:px-10 sm:py-14 lg:px-14">
            <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  Free Public Beta
                </div>

                <h2 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  One workspace for the file tasks you do every day.
                </h2>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                  Start with the tools already live today. New image, PDF, audio,
                  creator, utility, and AI tools will be added progressively during
                  the beta.
                </p>

                <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
                  <span>Core tools free during beta</span>
                  <span>•</span>
                  <span>No credit card</span>
                  <span>•</span>
                  <span>Fair-use limits for cloud and AI processing</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  href="/sign-up"
                  className="rounded-lg bg-primary px-6 py-3 text-center font-semibold text-white transition hover:bg-primary-hover"
                >
                  Start Free
                </Link>

                <Link
                  href="/tools"
                  className="rounded-lg border border-white/20 px-6 py-3 text-center font-semibold text-white transition hover:bg-white/10"
                >
                  Explore Tools
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>



      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="lg:col-span-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xl font-bold text-foreground"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
                  AI
                </span>

                AI Media
              </Link>

              <p className="mt-5 max-w-md text-sm leading-7 text-muted">
                A practical media, PDF, document, and AI toolbox for everyday file
                work. Prepare, transform, organize, and download what you need from
                one simple workspace.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Free Public Beta
                </span>

                <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted">
                  More tools coming
                </span>
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Product
              </h3>

              <div className="mt-5 flex flex-col gap-3 text-sm">
                <Link
                  href="/tools"
                  className="text-muted transition hover:text-primary"
                >
                  Tools
                </Link>

                <a
                  href="#features"
                  className="text-muted transition hover:text-primary"
                >
                  Features
                </a>

                <a
                  href="#how-it-works"
                  className="text-muted transition hover:text-primary"
                >
                  Categories
                </a>

                <Link
                  href="/pricing"
                  className="text-muted transition hover:text-primary"
                >
                  Pricing
                </Link>

                <Link
                  href="/sign-in"
                  className="text-muted transition hover:text-primary"
                >
                  Sign in
                </Link>

                <Link
                  href="/sign-up"
                  className="text-muted transition hover:text-primary"
                >
                  Get started
                </Link>
              </div>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Company
              </h3>

              <div className="mt-5 flex flex-col gap-3 text-sm">
                <a
                  href="https://bhanavo-technologies-v1.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-muted transition hover:text-primary"
                >
                  Bhanova Technologies
                  <span aria-hidden="true">↗</span>
                </a>

                <a
                  href="https://github.com/AnupBhandari12/ai-media-saas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-muted transition hover:text-primary"
                >
                  GitHub
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              © 2026 AI Media. All rights reserved.
            </p>

            <p>
              Built by{" "}
              <a
                href="https://bhanavo-technologies-v1.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground transition hover:text-primary"
              >
                Bhanova Technologies
              </a>
              .
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}