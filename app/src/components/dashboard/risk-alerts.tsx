"use client";

import { Card, Text, Badge } from "@tremor/react";
import { AlertTriangle, Clock, TrendingUp, Users, ArrowRight, Check } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

const alerts = [
  {
    id: 1,
    type: "eta_inflation",
    severity: "high",
    title: "ETA inflated by 45%",
    description: "Task 'OAuth2 Integration' ETA increased from 24h to 35h",
    entity: "Task #1002",
    timestamp: "2 hours ago",
  },
  {
    id: 2,
    type: "silent_overrun",
    severity: "critical",
    title: "Silent overrun detected",
    description: "'ETL Pipeline' has spent 32h against 24h ETA but remains active",
    entity: "Task #2001",
    timestamp: "5 hours ago",
  },
  {
    id: 3,
    type: "load_concentration",
    severity: "medium",
    title: "Load concentration at 68%",
    description: "Top 3 developers carrying 68% of remaining workload",
    entity: "Team",
    timestamp: "1 day ago",
  },
  {
    id: 4,
    type: "phantom_bandwidth",
    severity: "medium",
    title: "Phantom bandwidth detected",
    description: "Neha shows 60% availability but only 35% closure rate",
    entity: "Neha Gupta",
    timestamp: "1 day ago",
  },
];

const severityConfig = {
  critical: { color: "red", bg: "bg-red-500/10", border: "border-red-500/30", icon: AlertTriangle },
  high: { color: "orange", bg: "bg-orange-500/10", border: "border-orange-500/30", icon: TrendingUp },
  medium: { color: "yellow", bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: Clock },
  low: { color: "blue", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: Users },
};

export function RiskAlerts() {
  const [resolvedIds, setResolvedIds] = useState<number[]>([]);

  const handleResolve = (id: number) => {
    setResolvedIds((prev) => [...prev, id]);
  };

  const activeAlerts = alerts.filter((a) => !resolvedIds.includes(a.id));

  return (
    <Card className="!bg-[var(--background-secondary)] !border-[var(--border)] h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          <Text className="!text-[var(--foreground)] font-medium">Risk Alerts</Text>
        </div>
        <Badge size="xs" color="orange">{activeAlerts.length} active</Badge>
      </div>

      <div className="space-y-3">
        {activeAlerts.length === 0 ? (
          <div className="py-8 text-center">
            <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <Text className="!text-[var(--foreground-muted)]">All clear! No active alerts.</Text>
          </div>
        ) : (
          activeAlerts.map((alert) => {
            const config = severityConfig[alert.severity as keyof typeof severityConfig];
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className={clsx(
                  "p-3 rounded-lg border transition-all",
                  config.bg,
                  config.border
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg bg-${config.color}-500/20`}>
                    <Icon className={`w-4 h-4 text-${config.color}-400`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Text className="!text-[var(--foreground)] font-medium text-sm truncate">
                        {alert.title}
                      </Text>
                      <Badge size="xs" color={config.color}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <Text className="!text-[var(--foreground-muted)] text-xs line-clamp-2">
                      {alert.description}
                    </Text>
                    <div className="flex items-center gap-2 mt-2">
                      <Text className="!text-[var(--foreground-muted)] text-xs">
                        {alert.entity}
                      </Text>
                      <span className="text-[var(--foreground-muted)]">·</span>
                      <Text className="!text-[var(--foreground-muted)] text-xs">
                        {alert.timestamp}
                      </Text>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[var(--border)]">
                  <button 
                    onClick={() => handleResolve(alert.id)}
                    className="flex-1 text-xs py-1.5 rounded bg-[var(--background)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-light)] transition-colors"
                  >
                    Resolve
                  </button>
                  <button className="flex-1 text-xs py-1.5 rounded bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors flex items-center justify-center gap-1">
                    View <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

