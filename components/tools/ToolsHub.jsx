"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { TOOL_STATUS, tools } from "@/lib/tools/registry";

export default function ToolsHub() {
  const [search, setSearch] = useState("");

  const filteredTools = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return tools;
    }

    return tools.filter((tool) => {
      return [
        tool.id,
        tool.name,
        tool.description,
        tool.category,
        tool.slug,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [search]);

  return (
    <div>
      <div className="relative max-w-2xl">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        />

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tools..."
          className="w-full rounded-xl border border-border bg-surface py-3 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary"
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted">{filteredTools.length} tools found</p>

        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Image Tools
        </span>
      </div>

      {filteredTools.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="font-medium text-foreground">No tools found</p>

          <p className="mt-2 text-sm text-muted">Try another search term.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTools.map((tool) => {
            const isAvailable = tool.status === TOOL_STATUS.AVAILABLE;

            return (
              <article
                key={tool.id}
                className="flex min-h-64 flex-col rounded-2xl border border-border bg-surface p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    {tool.id}
                  </span>

                  <span className="text-xs font-medium text-muted">
                    {tool.priority}
                  </span>
                </div>

                <h2 className="mt-5 text-lg font-semibold text-foreground">
                  {tool.name}
                </h2>

                <p className="mt-2 flex-1 text-sm leading-6 text-muted">
                  {tool.description}
                </p>

                <div className="mt-5">
                  {isAvailable ? (
                    <Link
                      href={tool.route}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
                    >
                      Open Tool
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-muted opacity-70"
                    >
                      Coming Soon
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
