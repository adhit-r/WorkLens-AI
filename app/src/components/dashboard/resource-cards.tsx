"use client";

import { Card, Text, Metric, Flex, ProgressBar } from "@tremor/react";
import { User, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx } from "clsx";

const resources = [
  {
    name: "Adhithya Kumar",
    role: "Tech Lead",
    avatar: "AK",
    eta: 40,
    spent: 28,
    yetToSpend: 12,
    bandwidth: 28,
    availability: 70,
    activeTaskCount: 3,
    state: "balanced" as const,
    trend: "up" as const,
  },
  {
    name: "Priya Sharma",
    role: "Senior Engineer",
    avatar: "PS",
    eta: 62,
    spent: 44,
    yetToSpend: 18,
    bandwidth: 22,
    availability: 55,
    activeTaskCount: 5,
    state: "balanced" as const,
    trend: "down" as const,
  },
  {
    name: "Rahul Verma",
    role: "Software Engineer",
    avatar: "RV",
    eta: 52,
    spent: 32,
    yetToSpend: 20,
    bandwidth: 20,
    availability: 50,
    activeTaskCount: 4,
    state: "at_risk" as const,
    trend: "down" as const,
  },
  {
    name: "Sneha Patel",
    role: "QA Engineer",
    avatar: "SP",
    eta: 30,
    spent: 18,
    yetToSpend: 12,
    bandwidth: 28,
    availability: 70,
    activeTaskCount: 3,
    state: "balanced" as const,
    trend: "stable" as const,
  },
  {
    name: "Neha Gupta",
    role: "Software Engineer",
    avatar: "NG",
    eta: 56,
    spent: 30,
    yetToSpend: 26,
    bandwidth: 14,
    availability: 35,
    activeTaskCount: 4,
    state: "at_risk" as const,
    trend: "down" as const,
  },
  {
    name: "Karthik Nair",
    role: "Software Engineer",
    avatar: "KN",
    eta: 48,
    spent: 34,
    yetToSpend: 14,
    bandwidth: 26,
    availability: 65,
    activeTaskCount: 3,
    state: "balanced" as const,
    trend: "up" as const,
  },
];

const stateConfig = {
  overloaded: { label: "Overloaded", color: "red", bgColor: "bg-red-500/20", borderColor: "border-red-500/30", textColor: "text-red-400" },
  at_risk: { label: "At Risk", color: "orange", bgColor: "bg-orange-500/20", borderColor: "border-orange-500/30", textColor: "text-orange-400" },
  balanced: { label: "Balanced", color: "emerald", bgColor: "bg-emerald-500/20", borderColor: "border-emerald-500/30", textColor: "text-emerald-400" },
  underutilized: { label: "Underutilized", color: "blue", bgColor: "bg-blue-500/20", borderColor: "border-blue-500/30", textColor: "text-blue-400" },
  idle_drift: { label: "Idle Drift", color: "gray", bgColor: "bg-gray-500/20", borderColor: "border-gray-500/30", textColor: "text-gray-400" },
};

export function ResourceCards() {
  return (
    <Card className="!bg-[var(--background-secondary)] !border-[var(--border)]">
      <div className="flex items-center justify-between mb-4">
        <Text className="!text-[var(--foreground)] font-medium">Team Resources</Text>
        <Text className="!text-[var(--foreground-muted)] text-xs">{resources.length} members</Text>
      </div>
      
      <div className="space-y-3">
        {resources.map((resource) => {
          const state = stateConfig[resource.state];
          return (
            <div
              key={resource.name}
              className="p-4 rounded-lg bg-[var(--background)] border border-[var(--border)] card-hover cursor-pointer"
            >
              <Flex alignItems="start">
                {/* Avatar & Info */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-white text-sm font-medium">
                    {resource.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Text className="!text-[var(--foreground)] font-medium truncate">
                        {resource.name}
                      </Text>
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        state.bgColor, state.borderColor, state.textColor, "border"
                      )}>
                        {state.label}
                      </span>
                    </div>
                    <Text className="!text-[var(--foreground-muted)] text-xs">
                      {resource.role} · {resource.activeTaskCount} active tasks
                    </Text>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <Text className="!text-[var(--foreground-muted)] text-xs">Bandwidth</Text>
                    <Text className="!text-[var(--foreground)] font-medium">{resource.bandwidth}h</Text>
                  </div>
                  <div className="text-right">
                    <Text className="!text-[var(--foreground-muted)] text-xs">Availability</Text>
                    <div className="flex items-center gap-1">
                      <Text className={clsx(
                        "font-medium",
                        resource.availability >= 60 ? "!text-emerald-400" : 
                        resource.availability >= 30 ? "!text-orange-400" : "!text-red-400"
                      )}>
                        {resource.availability}%
                      </Text>
                      {resource.trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                      {resource.trend === "down" && <TrendingDown className="w-3 h-3 text-red-400" />}
                      {resource.trend === "stable" && <Minus className="w-3 h-3 text-gray-400" />}
                    </div>
                  </div>
                </div>
              </Flex>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <Text className="!text-[var(--foreground-muted)]">
                    {resource.spent}h spent / {resource.eta}h ETA
                  </Text>
                  <Text className="!text-[var(--foreground-muted)]">
                    {resource.yetToSpend}h remaining
                  </Text>
                </div>
                <div className="h-1.5 bg-[var(--background-tertiary)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--color-primary)] rounded-full transition-all"
                    style={{ width: `${(resource.spent / resource.eta) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

