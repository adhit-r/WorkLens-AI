"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Sparkles, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Clock,
  Users,
  Target,
  ChevronRight
} from "lucide-react"

const insights = [
  {
    id: 1,
    type: "risk",
    title: "Load Concentration Detected",
    description: "Same 3 developers are handling 64% of critical tasks this quarter. All linked to internal NDS tasks with unclear closure criteria.",
    confidence: 82,
    impact: "high",
    category: "workload",
    actions: ["Redistribute tasks", "Clarify NDS criteria"],
  },
  {
    id: 2,
    type: "opportunity",
    title: "Delivery Improvement Opportunity",
    description: "Project Phoenix ETA overruns correlate strongly with QA resource switches mid-sprint. Stabilizing QA assignments could reduce overruns by 35%.",
    confidence: 78,
    impact: "medium",
    category: "delivery",
    actions: ["Lock QA assignments", "Review sprint planning"],
  },
  {
    id: 3,
    type: "warning",
    title: "Phantom Bandwidth Detected",
    description: "Team A shows 22% availability, but 71% of remaining ETA is tied to a single long-running project with stagnant status updates.",
    confidence: 87,
    impact: "high",
    category: "capacity",
    actions: ["Audit stagnant tasks", "Update status tracking"],
  },
  {
    id: 4,
    type: "trend",
    title: "Velocity Improvement",
    description: "Sprint completion rate improved by 12% over the last 4 weeks. Main drivers: better estimation and reduced context switching.",
    confidence: 91,
    impact: "positive",
    category: "performance",
    actions: ["Document best practices", "Share with other teams"],
  },
  {
    id: 5,
    type: "risk",
    title: "ETA Inflation Pattern",
    description: "Project Atlas shows consistent ETA increases without corresponding scope changes. Average inflation: 24% per sprint.",
    confidence: 76,
    impact: "medium",
    category: "estimation",
    actions: ["Review estimation process", "Add checkpoints"],
  },
]

function getTypeIcon(type: string) {
  switch (type) {
    case "risk": return AlertTriangle
    case "opportunity": return Lightbulb
    case "warning": return Clock
    case "trend": return TrendingUp
    default: return Sparkles
  }
}

function getTypeStyle(type: string) {
  switch (type) {
    case "risk":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    case "opportunity":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "warning":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    case "trend":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    default:
      return "bg-secondary text-secondary-foreground"
  }
}

function getImpactStyle(impact: string) {
  switch (impact) {
    case "high":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    case "medium":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    case "positive":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    default:
      return "bg-secondary text-secondary-foreground"
  }
}

export default function InsightsPage() {
  const stats = {
    total: insights.length,
    risks: insights.filter(i => i.type === "risk").length,
    opportunities: insights.filter(i => i.type === "opportunity").length,
    avgConfidence: Math.round(insights.reduce((acc, i) => acc + i.confidence, 0) / insights.length),
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Insights</h1>
          <p className="text-muted-foreground">
            ML-powered analysis of workload patterns and risks
          </p>
        </div>
        <Button variant="outline">
          Generate Report
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Active Insights</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.risks}</p>
                <p className="text-sm text-muted-foreground">Risks Identified</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/20">
                <Lightbulb className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.opportunities}</p>
                <p className="text-sm text-muted-foreground">Opportunities</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgConfidence}%</p>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights List */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="grid gap-4">
            {insights.map((insight) => {
              const Icon = getTypeIcon(insight.type)
              return (
                <Card key={insight.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${getTypeStyle(insight.type)}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold">{insight.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={getTypeStyle(insight.type)}>
                                {insight.type}
                              </Badge>
                              <Badge variant="outline" className={getImpactStyle(insight.impact)}>
                                {insight.impact} impact
                              </Badge>
                              <Badge variant="secondary">
                                {insight.confidence}% confidence
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          {insight.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Suggested actions:</span>
                          {insight.actions.map((action, i) => (
                            <Button key={i} variant="outline" size="sm" className="text-xs h-7">
                              {action}
                              <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="risks" className="mt-4">
          <div className="grid gap-4">
            {insights.filter(i => i.type === "risk").map((insight) => {
              const Icon = getTypeIcon(insight.type)
              return (
                <Card key={insight.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${getTypeStyle(insight.type)}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{insight.title}</h3>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="opportunities" className="mt-4">
          <div className="grid gap-4">
            {insights.filter(i => i.type === "opportunity").map((insight) => {
              const Icon = getTypeIcon(insight.type)
              return (
                <Card key={insight.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${getTypeStyle(insight.type)}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{insight.title}</h3>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <div className="grid gap-4">
            {insights.filter(i => i.type === "trend").map((insight) => {
              const Icon = getTypeIcon(insight.type)
              return (
                <Card key={insight.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${getTypeStyle(insight.type)}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{insight.title}</h3>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
