import Link from "next/link";
import Navbar from "@/components/layout/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      

      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">
              AI-powered media toolkit
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Optimize images and videos without complicated editing tools.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              Upload your media, create social-ready images, optimize videos,
              preview results, and manage everything from one simple workspace.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="rounded-lg bg-primary px-6 py-3 text-center font-semibold text-white transition hover:bg-primary-hover"
              >
                Start Free
              </Link>

              <a
                href="#features"
                className="rounded-lg border border-border bg-surface px-6 py-3 text-center font-semibold text-foreground transition hover:bg-slate-50"
              >
                Explore Features
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Media Preview
                </p>

                <p className="mt-1 text-sm text-muted">
                  Smart optimization preview
                </p>
              </div>

              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Optimized
              </span>
            </div>

            <div className="flex min-h-64 items-center justify-center rounded-xl bg-slate-100">
              <div className="text-center">
                <p className="font-semibold text-foreground">
                  Before / After Preview
                </p>

                <p className="mt-2 text-sm text-muted">
                  Your processed image or video will appear here.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted">Original</p>

                <p className="mt-1 font-semibold text-foreground">
                  12.4 MB
                </p>
              </div>

              <div className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted">Optimized</p>

                <p className="mt-1 font-semibold text-secondary">
                  4.1 MB
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section id="features" className="border-t border-border bg-surface px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Everything in one workspace
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Simple tools for everyday media work.
            </h2>

            <p className="mt-4 text-lg leading-8 text-muted">
              Upload, optimize, preview, and manage your media without switching
              between complicated editing applications.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <article className="rounded-2xl border border-border bg-background p-6">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                01
              </div>

              <h3 className="text-xl font-semibold text-foreground">
                Image Studio
              </h3>

              <p className="mt-3 leading-7 text-muted">
                Create social-ready images with smart cropping, optimized delivery,
                and ready-to-use presets.
              </p>

              <p className="mt-6 text-sm font-semibold text-primary">
                Smart crop · Resize · Optimize
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-background p-6">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-sm font-bold text-secondary">
                02
              </div>

              <h3 className="text-xl font-semibold text-foreground">
                Video Studio
              </h3>

              <p className="mt-3 leading-7 text-muted">
                Upload and optimize videos, generate thumbnails, preview results, and
                reduce unnecessary file size.
              </p>

              <p className="mt-6 text-sm font-semibold text-secondary">
                Compress · Preview · Download
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-background p-6">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                03
              </div>

              <h3 className="text-xl font-semibold text-foreground">
                Media Library
              </h3>

              <p className="mt-3 leading-7 text-muted">
                Keep images and videos organized in your own private workspace and
                access previous uploads whenever you need them.
              </p>

              <p className="mt-6 text-sm font-semibold text-primary">
                Search · Filter · Manage
              </p>
            </article>
          </div>
        </div>
      </section>


      <section  id="how-it-works" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              How it works
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              From upload to optimized media in three steps.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-muted">
              Keep the workflow simple while Cloudinary handles the heavy media
              processing behind the scenes.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                1
              </div>

              <h3 className="mt-5 text-xl font-semibold text-foreground">
                Upload
              </h3>

              <p className="mt-3 leading-7 text-muted">
                Choose an image or video from your device and upload it securely.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-sm font-bold text-white">
                2
              </div>

              <h3 className="mt-5 text-xl font-semibold text-foreground">
                Optimize
              </h3>

              <p className="mt-3 leading-7 text-muted">
                Smart Cloudinary transformations optimize, resize, crop, or preview
                your media.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                3
              </div>

              <h3 className="mt-5 text-xl font-semibold text-foreground">
                Download
              </h3>

              <p className="mt-3 leading-7 text-muted">
                Preview the result, save it to your library, and download the final
                optimized file.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl bg-foreground px-8 py-14 text-center sm:px-12">
            <p className="text-sm font-semibold uppercase tracking-wider text-secondary">
              Free public beta
            </p>

            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Start optimizing your media without complicated editing software.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Create your workspace, upload your media, and try the core tools for
              free during the beta.
            </p>

            <div className="mt-8">
              <Link
                href="/sign-up"
                className="inline-flex rounded-lg bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover"
              >
                Get Started Free
              </Link>
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
                Smart image and video tools for creators, students, and businesses.
                Optimize, transform, preview, and manage your media from one simple
                workspace.
              </p>

              <div className="mt-6">
                <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Free Public Beta
                </span>
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Product
              </h3>

              <div className="mt-5 flex flex-col gap-3 text-sm">
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
                  How it works
                </a>

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

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              © 2026 AI Media. All rights reserved.
            </p>

            <p>
              A product by{" "}
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