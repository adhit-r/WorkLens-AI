"use client";

import { Calendar, Download, RefreshCw, Filter } from "lucide-react";
import { clsx } from "clsx";

export function QuickActions() {
  return (
    <div className="flex items-center gap-2">
      {/* Period Selector */}
      <div className="flex items-center bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg p-1">
        <button className={clsx(
          "px-3 py-1.5 text-sm rounded-md transition-colors",
          "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
        )}>
          Week
        </button>
        <button className="px-3 py-1.5 text-sm rounded-md text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
          Month
        </button>
      </div>

      {/* Filter */}
      <button className="p-2.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-light)] transition-colors">
        <Filter className="w-4 h-4" />
      </button>

      {/* Refresh */}
      <button className="p-2.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-light)] transition-colors">
        <RefreshCw className="w-4 h-4" />
      </button>

      {/* Export */}
      <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors">
        <Download className="w-4 h-4" />
        Export
      </button>
    </div>
  );
}

