"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { formatStatus, getStatusColor as getStatusColorUtil } from "@/lib/status-utils"

function getStatusColor(status: string) {
  switch (status) {
    case "overloaded": return "text-red-600 bg-red-50 dark:bg-red-900/20"
    case "at-risk": return "text-orange-600 bg-orange-50 dark:bg-orange-900/20"
    case "balanced": return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
    case "underutilized": return "text-blue-600 bg-blue-50 dark:bg-blue-900/20"
    default: return "text-slate-600 bg-slate-50 dark:bg-slate-900/20"
  }
}

export default function TeamPage() {
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<any[]>([])

  useEffect(() => {
    const loadTeam = async () => {
      try {
        setLoading(true)
        const employees = await api.getEmployees()
        
        const teamData = await Promise.all(
          (employees || []).map(async (emp: any) => {
            try {
              const workload = await api.getResourceWorkload(emp.emp_number, 'week')
              return {
                name: `${emp.emp_firstname} ${emp.emp_lastname}`,
                role: emp.job_title || 'Employee',
                bandwidth: Math.round(workload?.bandwidth || 0),
                status: workload?.workloadState || 'balanced',
                activeTasks: workload?.activeTaskCount || 0,
              }
            } catch {
              return {
                name: `${emp.emp_firstname} ${emp.emp_lastname}`,
                role: emp.job_title || 'Employee',
                bandwidth: 0,
                status: 'balanced',
                activeTasks: 0,
              }
            }
          })
        )
        
        setTeamMembers(teamData)
      } catch (error) {
        console.error('Failed to load team data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTeam()
  }, [])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-sm text-muted-foreground">Team member workload and capacity</p>
      </div>

      {teamMembers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No team data available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map((member, idx) => (
            <Card key={idx}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                  <Badge className={`text-xs ${getStatusColorUtil(formatStatus(member.status))}`}>
                    {formatStatus(member.status)}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Bandwidth</span>
                    <span className="font-medium">{member.bandwidth}%</span>
                  </div>
                  <Progress value={member.bandwidth} className="h-2" />
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{member.activeTasks} tasks</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
