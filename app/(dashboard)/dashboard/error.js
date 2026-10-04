"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({ reset }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
        <AlertTriangle size={22} />
      </div>

      <h2 className="mt-5 text-xl font-semibold text-foreground">
        Something went wrong
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
        We could not load your dashboard right now. Please try again.
      </p>

      <button
        type="button"
        onClick={() => reset()}
        className="mx-auto mt-6 flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
      >
        <RefreshCw size={16} />
        Try again
      </button>
    </div>
  );
}