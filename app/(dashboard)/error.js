"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardAreaError({
  error,
  reset,
}) {
  useEffect(() => {
    console.error("Dashboard area error:", error);
  }, [error]);

  return (
    <div className="flex min-h-105 items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle size={24} />
        </div>

        <h1 className="mt-5 text-xl font-semibold text-foreground">
          Something went wrong
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted">
          We could not load this section. Please try again.
        </p>

        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
        >
          <RotateCcw size={16} />
          Try Again
        </button>
      </div>
    </div>
  );
}