"use client";

import { useEffect, useState } from "react";

export default function MonthlyUsage() {
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUsage() {
      try {
        const response = await fetch("/api/usage");

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load usage.");
        }

        setUsage(data);
      } catch (error) {
        console.error(error);
        setError("Usage information could not be loaded.");
      }
    }

    loadUsage();
  }, []);

  if (error) {
    return (
      <p className="text-sm text-red-600">
        {error}
      </p>
    );
  }

  if (!usage) {
    return (
      <p className="text-sm text-muted">
        Loading monthly usage...
      </p>
    );
  }

  const imagePercentage = Math.min(
    (usage.images.used / usage.images.limit) * 100,
    100
  );

  const videoPercentage = Math.min(
    (usage.videos.used / usage.videos.limit) * 100,
    100
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="flex items-center justify-between">
          <p className="font-medium text-foreground">
            Images
          </p>

          <p className="text-sm font-semibold text-foreground">
            {usage.images.used} / {usage.images.limit}
          </p>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{
              width: `${imagePercentage}%`,
            }}
          />
        </div>

        <p className="mt-2 text-xs text-muted">
          {usage.images.remaining} uploads remaining this month
        </p>
      </div>

      <div className="rounded-xl border border-border bg-background p-4">
        <div className="flex items-center justify-between">
          <p className="font-medium text-foreground">
            Videos
          </p>

          <p className="text-sm font-semibold text-foreground">
            {usage.videos.used} / {usage.videos.limit}
          </p>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{
              width: `${videoPercentage}%`,
            }}
          />
        </div>

        <p className="mt-2 text-xs text-muted">
          {usage.videos.remaining} uploads remaining this month
        </p>
      </div>
    </div>
  );
}