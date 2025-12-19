"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { 
  Bug, 
  Users, 
  RefreshCw, 
  Plus, 
  Settings, 
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Trash2,
  ExternalLink,
  Zap
} from "lucide-react"

// Mock integrations data
const mockIntegrations = [
  {
    id: "1",
    type: "mantis",
    name: "Mantis Bug Tracker",
    enabled: true,
    lastSync: "2024-12-18T10:30:00Z",
    syncStatus: "idle",
    stats: { projects: 5, issues: 234, users: 12 },
  },
  {
    id: "2",
    type: "jira",
    name: "Jira Cloud",
    enabled: true,
    lastSync: "2024-12-18T09:15:00Z",
    syncStatus: "idle",
    stats: { projects: 8, issues: 156, users: 24 },
  },
  {
    id: "3",
    type: "hrms",
    name: "BambooHR",
    enabled: true,
    lastSync: "2024-12-18T08:00:00Z",
    syncStatus: "idle",
    stats: { employees: 45, leaves: 12, holidays: 15 },
  },
]

const integrationTypes = [
  { 
    value: "mantis", 
    label: "Mantis Bug Tracker", 
    icon: Bug, 
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    fields: ["baseUrl", "apiToken"]
  },
  { 
    value: "jira", 
    label: "Jira (Cloud/Server)", 
    icon: Zap, 
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    fields: ["baseUrl", "email", "apiToken"]
  },
  { 
    value: "hrms", 
    label: "HRMS", 
    icon: Users, 
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    fields: ["provider", "baseUrl", "apiKey"]
  },
]

const hrmsProviders = [
  { value: "bamboohr", label: "BambooHR" },
  { value: "workday", label: "Workday" },
  { value: "sap", label: "SAP SuccessFactors" },
  { value: "custom", label: "Custom API" },
]

function getIntegrationType(type: string) {
  return integrationTypes.find(t => t.value === type)
}

function formatDate(date: string) {
  return new Date(date).toLocaleString()
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState(mockIntegrations)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newIntegration, setNewIntegration] = useState({
    type: "",
    name: "",
    baseUrl: "",
    email: "",
    apiToken: "",
    apiKey: "",
    provider: "",
  })
  const [syncingId, setSyncingId] = useState<string | null>(null)

  const handleSync = async (id: string) => {
    setSyncingId(id)
    // Simulate sync
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIntegrations(prev => prev.map(int => 
      int.id === id 
        ? { ...int, lastSync: new Date().toISOString() }
        : int
    ))
    setSyncingId(null)
  }

  const handleAdd = () => {
    const type = getIntegrationType(newIntegration.type)
    if (!type) return

    const newInt = {
      id: Date.now().toString(),
      type: newIntegration.type,
      name: newIntegration.name || type.label,
      enabled: true,
      lastSync: null as any,
      syncStatus: "idle",
      stats: {},
    }

    setIntegrations(prev => [...prev, newInt])
    setIsAddDialogOpen(false)
    setNewIntegration({
      type: "",
      name: "",
      baseUrl: "",
      email: "",
      apiToken: "",
      apiKey: "",
      provider: "",
    })
  }

  const handleDelete = (id: string) => {
    setIntegrations(prev => prev.filter(int => int.id !== id))
  }

  const handleToggle = (id: string) => {
    setIntegrations(prev => prev.map(int =>
      int.id === id ? { ...int, enabled: !int.enabled } : int
    ))
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground">
            Connect Mantis, Jira, and HRMS to sync your data
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Integration</DialogTitle>
              <DialogDescription>
                Connect a new data source to WorkLens
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Integration Type</label>
                <Select 
                  value={newIntegration.type} 
                  onValueChange={(v) => setNewIntegration(prev => ({ ...prev, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {integrationTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newIntegration.type && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name (optional)</label>
                    <Input
                      placeholder="e.g., Production Jira"
                      value={newIntegration.name}
                      onChange={(e) => setNewIntegration(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  {newIntegration.type === "hrms" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">HRMS Provider</label>
                      <Select 
                        value={newIntegration.provider} 
                        onValueChange={(v) => setNewIntegration(prev => ({ ...prev, provider: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {hrmsProviders.map(p => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Base URL</label>
                    <Input
                      placeholder={
                        newIntegration.type === "mantis" 
                          ? "https://mantis.yourcompany.com" 
                          : newIntegration.type === "jira"
                          ? "https://yourcompany.atlassian.net"
                          : "https://api.bamboohr.com"
                      }
                      value={newIntegration.baseUrl}
                      onChange={(e) => setNewIntegration(prev => ({ ...prev, baseUrl: e.target.value }))}
                    />
                  </div>

                  {newIntegration.type === "jira" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        placeholder="your.email@company.com"
                        value={newIntegration.email}
                        onChange={(e) => setNewIntegration(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {newIntegration.type === "hrms" ? "API Key" : "API Token"}
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••••••••••"
                      value={newIntegration.type === "hrms" ? newIntegration.apiKey : newIntegration.apiToken}
                      onChange={(e) => setNewIntegration(prev => ({ 
                        ...prev, 
                        [newIntegration.type === "hrms" ? "apiKey" : "apiToken"]: e.target.value 
                      }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      {newIntegration.type === "jira" && (
                        <>Generate from <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" className="text-primary hover:underline">Atlassian Account Settings</a></>
                      )}
                      {newIntegration.type === "mantis" && "Found in Mantis → My Account → API Tokens"}
                      {newIntegration.type === "hrms" && "Contact your HRMS administrator"}
                    </p>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={!newIntegration.type || !newIntegration.baseUrl}>
                Add Integration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sync All */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary text-primary-foreground">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Sync All Integrations</p>
              <p className="text-sm text-muted-foreground">
                Pull latest data from all connected sources
              </p>
            </div>
          </div>
          <Button>
            Sync Now
          </Button>
        </CardContent>
      </Card>

      {/* Integrations List */}
      <div className="space-y-4">
        {integrations.map((integration) => {
          const type = getIntegrationType(integration.type)
          if (!type) return null
          const Icon = type.icon

          return (
            <Card key={integration.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${type.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{integration.name}</h3>
                        <Badge 
                          variant="outline" 
                          className={integration.enabled 
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                            : "bg-stone-100 text-stone-600"
                          }
                        >
                          {integration.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {type.label}
                      </p>
                      
                      {/* Stats */}
                      {integration.stats && Object.keys(integration.stats).length > 0 && (
                        <div className="flex items-center gap-4 mt-3">
                          {Object.entries(integration.stats).map(([key, value]) => (
                            <div key={key} className="text-sm">
                              <span className="font-medium">{value}</span>
                              <span className="text-muted-foreground ml-1">{key}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Last Sync */}
                      {integration.lastSync && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Last synced: {formatDate(integration.lastSync)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(integration.id)}
                      disabled={syncingId === integration.id}
                    >
                      {syncingId === integration.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(integration.id)}
                    >
                      {integration.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(integration.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {integrations.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Settings className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No integrations configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your issue tracker and HRMS to start syncing data
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Integration
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How Integrations Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/50">
              <Bug className="h-5 w-5 mb-2 text-green-600" />
              <h4 className="font-medium mb-1">Issue Trackers</h4>
              <p className="text-muted-foreground text-xs">
                Mantis & Jira sync projects, tasks, ETAs, and time logged. Updates flow automatically.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 mb-2 text-purple-600" />
              <h4 className="font-medium mb-1">HRMS</h4>
              <p className="text-muted-foreground text-xs">
                Employee data, working hours, leaves, and holidays. Calculates real availability.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <Zap className="h-5 w-5 mb-2 text-primary" />
              <h4 className="font-medium mb-1">AI Insights</h4>
              <p className="text-muted-foreground text-xs">
                Combined data powers workload analysis, risk detection, and smart recommendations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

