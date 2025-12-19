"use client";

import { Card, Text } from "@tremor/react";
import { Sparkles, RefreshCw, ChevronRight } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

const insights = [
  {
    id: 1,
    type: "warning",
    message: "QA bandwidth dropped 18% this week primarily due to Project Atlas consuming 62% of remaining ETA across 3 resources.",
    confidence: 0.87,
  },
  {
    id: 2,
    type: "info",
    message: "Three developers account for 64% of over-ETA incidents this quarter, all linked to internal NDS tasks with unclear closure criteria.",
    confidence: 0.82,
  },
  {
    id: 3,
    type: "success",
    message: "Project Phoenix is on track with healthy velocity. Current burn rate suggests completion 3 days ahead of schedule.",
    confidence: 0.91,
  },
];

export function WhyPanel() {
  const [currentInsight, setCurrentInsight] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const insight = insights[currentInsight];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setCurrentInsight((prev) => (prev + 1) % insights.length);
      setIsRefreshing(false);
    }, 500);
  };

  const typeConfig = {
    warning: { bg: "bg-orange-500/10", border: "border-orange-500/30", dot: "bg-orange-400" },
    info: { bg: "bg-blue-500/10", border: "border-blue-500/30", dot: "bg-blue-400" },
    success: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  };

  const config = typeConfig[insight.type as keyof typeof typeConfig];

  return (
    <Card className={clsx(
      "!bg-[var(--background-secondary)] !border-[var(--border)]",
      "relative overflow-hidden"
    )}>
      {/* Gradient Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-secondary)] to-[var(--color-accent)]" />

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-secondary)]/20 border border-[var(--color-primary)]/30">
          <Sparkles className="w-6 h-6 text-[var(--color-primary)]" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Text className="!text-[var(--foreground)] font-medium">AI Insight</Text>
            <div className={clsx("w-2 h-2 rounded-full animate-pulse", config.dot)} />
            <Text className="!text-[var(--foreground-muted)] text-xs">
              {Math.round(insight.confidence * 100)}% confidence
            </Text>
          </div>

          <div className={clsx(
            "p-4 rounded-lg",
            config.bg,
            config.border,
            "border"
          )}>
            <Text className="!text-[var(--foreground)] leading-relaxed">
              {insight.message}
            </Text>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2 mt-3">
            {insights.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentInsight(index)}
                className={clsx(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentInsight 
                    ? "bg-[var(--color-primary)] w-6" 
                    : "bg-[var(--background-tertiary)] hover:bg-[var(--border-light)]"
                )}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--background-tertiary)] transition-colors"
            disabled={isRefreshing}
          >
            <RefreshCw className={clsx("w-4 h-4", isRefreshing && "animate-spin")} />
          </button>
          <button className="p-2 rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--background-tertiary)] transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}

