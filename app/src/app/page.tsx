"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  FolderKanban,
  RefreshCw,
  Loader2
} from "lucide-react"
import { api } from "@/lib/api"
import { formatStatus, getStatusColor as getStatusColorUtil } from "@/lib/status-utils"

function getStatusColor(status: string) {
  switch (status) {
    case "overloaded": return "text-red-600 bg-red-50 dark:bg-red-900/20"
    case "at-risk": return "text-orange-600 bg-orange-50 dark:bg-orange-900/20"
    case "balanced":
    case "on-track": return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
    case "underutilized": return "text-blue-600 bg-blue-50 dark:bg-blue-900/20"
    default: return "text-slate-600 bg-slate-50 dark:bg-slate-900/20"
  }
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    activeTasks: 0,
    atRisk: 0,
    bandwidth: 0,
    teamMembers: 0,
  })
  const [projects, setProjects] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load workload overview
      const workload = await api.getWorkloadOverview('week')
      
      // Load projects
      const projectsData = await api.getProjects()
      
      // Load employees
      const employees = await api.getEmployees()
      
      // Calculate stats
      const activeTasks = workload?.activeTasks || 0
      const atRisk = workload?.atRiskTasks || 0
      const bandwidth = workload?.avgBandwidth || 0
      
      setStats({
        activeTasks,
        atRisk,
        bandwidth: Math.round(bandwidth),
        teamMembers: employees?.length || 0,
      })
      
      // Format projects
      const formattedProjects = (projectsData || []).map((p: any) => ({
        name: p.name,
        progress: p.progress || 0,
        status: p.health === 'healthy' ? 'on-track' : p.health === 'at-risk' ? 'at-risk' : 'on-track',
        tasks: p.activeTasks || 0,
      }))
      setProjects(formattedProjects)
      
      // Format team members (get workload for each)
      const teamData = await Promise.all(
        (employees || []).slice(0, 4).map(async (emp: any) => {
          try {
            const workload = await api.getResourceWorkload(emp.emp_number, 'week')
            return {
              name: `${emp.emp_firstname} ${emp.emp_lastname}`,
              role: emp.job_title || 'Employee',
              bandwidth: Math.round(workload?.bandwidth || 0),
              status: workload?.workloadState || 'balanced',
            }
          } catch {
            return {
              name: `${emp.emp_firstname} ${emp.emp_lastname}`,
              role: emp.job_title || 'Employee',
              bandwidth: 0,
              status: 'balanced',
            }
          }
        })
      )
      setTeamMembers(teamData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const statCards = [
    { 
      label: "Active Tasks", 
      value: stats.activeTasks.toString(), 
      change: "This week",
      icon: CheckCircle2 
    },
    { 
      label: "At Risk", 
      value: stats.atRisk.toString(), 
      change: "Tasks needing attention",
      icon: AlertTriangle 
    },
    { 
      label: "Team Bandwidth", 
      value: `${stats.bandwidth}%`, 
      change: "Average utilization",
      icon: Clock 
    },
    { 
      label: "Team Members", 
      value: stats.teamMembers.toString(), 
      change: "Active employees",
      icon: Users 
    },
  ]

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Team performance overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </div>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <stat.icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              <h2 className="font-semibold">Projects</h2>
            </div>
          </div>
          <CardContent className="p-4 space-y-4">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No projects found</p>
            ) : (
              projects.map((project) => (
                <div key={project.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{project.name}</span>
                    <Badge className={`text-xs ${getStatusColorUtil(formatStatus(project.status))}`}>
                      {formatStatus(project.status)}
                    </Badge>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{project.progress}% complete</span>
                    <span>{project.tasks} tasks</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <h2 className="font-semibold">Team</h2>
            </div>
          </div>
          <CardContent className="p-4 space-y-4">
            {teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No team data available</p>
            ) : (
              teamMembers.map((member, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                    <Badge className={`text-xs ${getStatusColorUtil(formatStatus(member.status))}`}>
                      {formatStatus(member.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={member.bandwidth} 
                      className="h-2 flex-1"
                    />
                    <span className="text-xs font-medium w-12 text-right">{member.bandwidth}%</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
