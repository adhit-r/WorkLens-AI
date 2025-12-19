"use client";

import { Bell, Search, User, Sun, Moon } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--background-secondary)] flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
          <input
            type="text"
            placeholder="Search tasks, projects, people..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs text-[var(--foreground-muted)] bg-[var(--background-tertiary)] rounded border border-[var(--border)]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--background-tertiary)] transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--background-tertiary)] transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--color-danger)]" />
        </button>

        {/* User */}
        <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--background-tertiary)] transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-[var(--foreground)]">Adhithya</p>
            <p className="text-xs text-[var(--foreground-muted)]">Tech Lead</p>
          </div>
        </button>
      </div>
    </header>
  );
}

