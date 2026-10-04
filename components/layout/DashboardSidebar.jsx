import Link from "next/link";
import {
  LayoutDashboard,
  ImageIcon,
  Video,
  Library,
  Settings,
} from "lucide-react";

export default function DashboardSidebar() {
  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
      <div className="border-b border-border px-6 py-5">
        <Link href="/dashboard" className="text-xl font-bold text-foreground">
          AI Media
        </Link>

        <p className="mt-1 text-xs text-muted">
          Media workspace
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary"
        >
          <LayoutDashboard size={18} />
          Dashboard
        </Link>

        <Link
          href="/studio/image"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-background hover:text-foreground"
        >
          <ImageIcon size={18} />
          Image Studio
        </Link>

        <Link
          href="/studio/video"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-background hover:text-foreground"
        >
          <Video size={18} />
          Video Studio
        </Link>

        <Link
          href="/library"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-background hover:text-foreground"
        >
          <Library size={18} />
          Media Library
        </Link>

        <Link
          href="/settings"
          className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-background hover:text-foreground"
        >
          <Settings size={18} />
          Settings
        </Link>
      </nav>
    </aside>
  );
}