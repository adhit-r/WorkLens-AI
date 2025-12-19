"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FolderKanban, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { formatStatus, getStatusColor as getStatusColorUtil } from "@/lib/status-utils"

function getStatusColor(status: string) {
  switch (status) {
    case "at-risk": return "text-orange-600 bg-orange-50 dark:bg-orange-900/20"
    case "on-track": return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
    default: return "text-slate-600 bg-slate-50 dark:bg-slate-900/20"
  }
}

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true)
        const projectsData = await api.getProjects()
        
        const formattedProjects = (projectsData || []).map((p: any) => ({
          name: p.name,
          progress: p.progress || 0,
          status: p.health === 'healthy' ? 'on-track' : p.health === 'at-risk' ? 'at-risk' : 'on-track',
          tasks: p.activeTasks || 0,
          dueDate: p.dueDate || null,
        }))
        
        setProjects(formattedProjects)
      } catch (error) {
        console.error('Failed to load projects:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
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
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-muted-foreground">Active project status and progress</p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No projects found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, idx) => (
            <Card key={idx}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{project.name}</span>
                  </div>
                  <Badge className={`text-xs ${getStatusColorUtil(formatStatus(project.status))}`}>
                    {formatStatus(project.status)}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{project.tasks} active tasks</span>
                  {project.dueDate && (
                    <span>Due {new Date(project.dueDate).toLocaleDateString()}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
