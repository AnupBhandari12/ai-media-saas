"use client";
import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold text-foreground">
          AI Media
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm font-medium text-muted transition hover:text-foreground"
          >
            Features
          </a>

          <Link
            href="/pricing"
            className="text-sm font-medium text-muted transition hover:text-foreground"
          >
            Pricing
          </Link>

          <Show when="signed-out">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-muted transition hover:text-foreground"
            >
              Sign in
            </Link>

            <Link
              href="/sign-up"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              Get Started
            </Link>
          </Show>

          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-muted transition hover:text-foreground"
            >
              Dashboard
            </Link>

            <UserButton afterSignOutUrl="/" />
          </Show>
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground md:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile navigation */}
      {menuOpen && (
        <nav className="border-t border-border bg-surface px-6 py-5 md:hidden">
          <div className="flex flex-col gap-4">
            <a
              href="#features"
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium text-muted"
            >
              Features
            </a>

            <Link
              href="/pricing"
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium text-muted"
            >
              Pricing
            </Link>

            <Show when="signed-out">
              <Link
                href="/sign-in"
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-muted"
              >
                Sign in
              </Link>

              <Link
                href="/sign-up"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Get Started
              </Link>
            </Show>

            <Show when="signed-in">
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-muted"
              >
                Dashboard
              </Link>

              <div className="pt-1">
                <UserButton afterSignOutUrl="/" />
              </div>
            </Show>
          </div>
        </nav>
      )}
    </header>
  );
}
