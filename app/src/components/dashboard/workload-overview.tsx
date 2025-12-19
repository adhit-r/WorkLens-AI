"use client";

import { Card, Metric, Text, Flex, ProgressBar, Grid, BadgeDelta } from "@tremor/react";
import { TrendingUp, TrendingDown, Users, Clock, AlertTriangle, CheckCircle } from "lucide-react";

const stats = [
  {
    title: "Active Tasks",
    value: "47",
    change: "+5",
    changeType: "increase" as const,
    icon: CheckCircle,
    color: "emerald",
  },
  {
    title: "Team Bandwidth",
    value: "156h",
    change: "-12h",
    changeType: "decrease" as const,
    icon: Clock,
    color: "blue",
  },
  {
    title: "Avg Availability",
    value: "62%",
    change: "+8%",
    changeType: "increase" as const,
    icon: Users,
    color: "cyan",
  },
  {
    title: "At Risk",
    value: "3",
    change: "+1",
    changeType: "increase" as const,
    icon: AlertTriangle,
    color: "orange",
  },
];

const workloadDistribution = [
  { name: "Overloaded", value: 2, color: "rose" },
  { name: "At Risk", value: 3, color: "orange" },
  { name: "Balanced", value: 4, color: "emerald" },
  { name: "Underutilized", value: 1, color: "blue" },
];

export function WorkloadOverview() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
        {stats.map((stat) => (
          <Card 
            key={stat.title} 
            className="!bg-[var(--background-secondary)] !border-[var(--border)] card-hover"
            decoration="top"
            decorationColor={stat.color}
          >
            <Flex alignItems="start">
              <div>
                <Text className="!text-[var(--foreground-muted)]">{stat.title}</Text>
                <Metric className="!text-[var(--foreground)] mt-1">{stat.value}</Metric>
              </div>
              <div className={`p-2 rounded-lg bg-${stat.color}-500/10`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
              </div>
            </Flex>
            <Flex className="mt-4" justifyContent="start" alignItems="center">
              <BadgeDelta
                deltaType={stat.changeType === "increase" ? "increase" : "decrease"}
                size="xs"
              >
                {stat.change}
              </BadgeDelta>
              <Text className="!text-[var(--foreground-muted)] text-xs ml-2">vs last week</Text>
            </Flex>
          </Card>
        ))}
      </Grid>

      {/* Workload Distribution */}
      <Card className="!bg-[var(--background-secondary)] !border-[var(--border)]">
        <Text className="!text-[var(--foreground-muted)] mb-4">Team Workload Distribution</Text>
        <div className="flex gap-2 items-center">
          {workloadDistribution.map((item) => (
            <div key={item.name} className="flex-1">
              <div className="flex justify-between mb-1">
                <Text className="!text-[var(--foreground-muted)] text-xs">{item.name}</Text>
                <Text className="!text-[var(--foreground)] text-xs font-medium">{item.value}</Text>
              </div>
              <div className={`h-2 rounded-full bg-${item.color}-500`} 
                style={{ width: `${(item.value / 10) * 100}%` }} 
              />
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-4 pt-4 border-t border-[var(--border)]">
          {workloadDistribution.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full bg-${item.color}-500`} />
              <Text className="!text-[var(--foreground-muted)] text-xs">{item.name}</Text>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

