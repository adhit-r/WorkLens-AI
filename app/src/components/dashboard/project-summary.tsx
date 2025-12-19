"use client";

import { Card, Text, Flex, ProgressBar, Badge } from "@tremor/react";
import { FolderKanban, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

const projects = [
  {
    id: 1,
    name: "Project Phoenix",
    description: "Core platform modernization",
    totalTasks: 12,
    completedTasks: 4,
    activeTasks: 8,
    totalEta: 96,
    timeSpent: 42,
    completionRate: 33,
    burnRate: 44,
    health: "good" as const,
    trend: "up" as const,
  },
  {
    id: 2,
    name: "Project Atlas",
    description: "Data analytics pipeline",
    totalTasks: 8,
    completedTasks: 2,
    activeTasks: 6,
    totalEta: 76,
    timeSpent: 38,
    completionRate: 25,
    burnRate: 50,
    health: "warning" as const,
    trend: "down" as const,
  },
  {
    id: 3,
    name: "Project Nebula",
    description: "Mobile app development",
    totalTasks: 6,
    completedTasks: 1,
    activeTasks: 5,
    totalEta: 60,
    timeSpent: 24,
    completionRate: 17,
    burnRate: 40,
    health: "good" as const,
    trend: "stable" as const,
  },
  {
    id: 4,
    name: "Client Portal",
    description: "Customer-facing portal",
    totalTasks: 5,
    completedTasks: 2,
    activeTasks: 3,
    totalEta: 42,
    timeSpent: 28,
    completionRate: 40,
    burnRate: 67,
    health: "critical" as const,
    trend: "down" as const,
  },
];

const healthConfig = {
  good: { label: "Healthy", icon: CheckCircle2, color: "emerald" },
  warning: { label: "At Risk", icon: AlertCircle, color: "orange" },
  critical: { label: "Critical", icon: AlertCircle, color: "red" },
};

export function ProjectSummary() {
  return (
    <Card className="!bg-[var(--background-secondary)] !border-[var(--border)]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-[var(--color-primary)]" />
          <Text className="!text-[var(--foreground)] font-medium">Project Summary</Text>
        </div>
        <Text className="!text-[var(--foreground-muted)] text-xs">{projects.length} active projects</Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((project) => {
          const health = healthConfig[project.health];
          return (
            <div
              key={project.id}
              className="p-4 rounded-lg bg-[var(--background)] border border-[var(--border)] card-hover cursor-pointer"
            >
              <Flex alignItems="start" className="mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Text className="!text-[var(--foreground)] font-medium">{project.name}</Text>
                    <Badge 
                      size="xs" 
                      color={health.color}
                      icon={health.icon}
                    >
                      {health.label}
                    </Badge>
                  </div>
                  <Text className="!text-[var(--foreground-muted)] text-xs mt-0.5">
                    {project.description}
                  </Text>
                </div>
                <div className="flex items-center gap-1">
                  {project.trend === "up" && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                  {project.trend === "down" && <TrendingDown className="w-4 h-4 text-red-400" />}
                </div>
              </Flex>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <Text className="!text-[var(--foreground-muted)] text-xs">Tasks</Text>
                  <Text className="!text-[var(--foreground)] font-medium">
                    {project.completedTasks}/{project.totalTasks}
                  </Text>
                </div>
                <div>
                  <Text className="!text-[var(--foreground-muted)] text-xs">Time</Text>
                  <Text className="!text-[var(--foreground)] font-medium">
                    {project.timeSpent}h/{project.totalEta}h
                  </Text>
                </div>
                <div>
                  <Text className="!text-[var(--foreground-muted)] text-xs">Burn Rate</Text>
                  <Text className={clsx(
                    "font-medium",
                    project.burnRate > 80 ? "!text-red-400" :
                    project.burnRate > 60 ? "!text-orange-400" : "!text-emerald-400"
                  )}>
                    {project.burnRate}%
                  </Text>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Text className="!text-[var(--foreground-muted)]">Completion</Text>
                  <Text className="!text-[var(--foreground)]">{project.completionRate}%</Text>
                </div>
                <ProgressBar 
                  value={project.completionRate} 
                  color={health.color as any}
                  className="h-1.5"
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

