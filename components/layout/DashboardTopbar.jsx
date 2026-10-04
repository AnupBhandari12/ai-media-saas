"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Menu,
  X,
  LayoutDashboard,
  ImageIcon,
  Video,
  Library,
  Settings,
} from "lucide-react";

export default function DashboardTopbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground lg:hidden"
              aria-label="Open dashboard menu"
              aria-expanded={menuOpen}
            >
              <Menu size={20} />
            </button>

            <div>
              <p className="text-sm font-semibold text-foreground">
                AI Media Workspace
              </p>

              <p className="hidden text-xs text-muted sm:block">
                Create, optimize, and manage your media
              </p>
            </div>
          </div>

          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Free Beta
          </span>
        </div>
      </header>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-surface shadow-xl transition-transform duration-200 lg:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-xl font-bold text-foreground">
              AI Media
            </p>

            <p className="mt-1 text-xs text-muted">
              Media workspace
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground"
            aria-label="Close dashboard menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex h-[calc(100%-81px)] flex-col gap-1 p-4">
          <Link
            href="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary"
          >
            <LayoutDashboard size={18} />
            Dashboard
          </Link>

          <Link
            href="/studio/image"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted"
          >
            <ImageIcon size={18} />
            Image Studio
          </Link>

          <Link
            href="/studio/video"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted"
          >
            <Video size={18} />
            Video Studio
          </Link>

          <Link
            href="/library"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted"
          >
            <Library size={18} />
            Media Library
          </Link>

          <Link
            href="/settings"
            onClick={() => setMenuOpen(false)}
            className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted"
          >
            <Settings size={18} />
            Settings
          </Link>
        </nav>
      </aside>
    </>
  );
}