"use client"

import { useCallback, useMemo } from "react"
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from "reactflow"
import "reactflow/dist/style.css"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react"
import { formatStatus, getStatusColor as getStatusColorUtil } from "@/lib/status-utils"

const mockTasks = [
  { id: "1", name: "OAuth2 Integration", assignee: "Priya", eta: 24, status: "active", blockedBy: [], blocking: ["3"] },
  { id: "2", name: "API Rate Limiting", assignee: "Adhithya", eta: 20, status: "active", blockedBy: [], blocking: [] },
  { id: "3", name: "Data Visualization", assignee: "Neha", eta: 16, status: "blocked", blockedBy: ["1"], blocking: ["4"] },
  { id: "4", name: "QA Data Accuracy", assignee: "Amit", eta: 8, status: "blocked", blockedBy: ["3"], blocking: ["5"] },
  { id: "5", name: "Performance Testing", assignee: "Amit", eta: 12, status: "pending", blockedBy: ["4"], blocking: [] },
  { id: "6", name: "Documentation", assignee: "Neha", eta: 6, status: "active", blockedBy: [], blocking: [] },
]

function TaskNode({ data }: { data: any }) {
  const statusStyles = {
    active: "border-l-blue-500 bg-blue-50 dark:bg-blue-900/20",
    blocked: "border-l-red-500 bg-red-50 dark:bg-red-900/20",
    completed: "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
    pending: "border-l-stone-400 bg-stone-50 dark:bg-stone-800/20",
  }

  const statusColors = {
    active: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    blocked: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    pending: "bg-stone-100 text-stone-700 dark:bg-stone-700/40 dark:text-stone-300",
  }

  return (
    <div className={`px-4 py-3 rounded-lg border border-l-4 min-w-[200px] ${statusStyles[data.status as keyof typeof statusStyles]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm">{data.label}</span>
        <Badge variant="secondary" className={`text-xs ${getStatusColorUtil(formatStatus(data.status))}`}>
          {formatStatus(data.status)}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>{data.assignee} · {data.eta}h ETA</p>
        {data.blockedBy > 0 && (
          <p className="text-red-600 dark:text-red-400">Blocked by {data.blockedBy} task(s)</p>
        )}
        {data.blocking > 0 && (
          <p className="text-orange-600 dark:text-orange-400">Blocking {data.blocking} task(s)</p>
        )}
      </div>
    </div>
  )
}

const nodeTypes = { task: TaskNode }

export default function DependenciesPage() {
  const [project, setProject] = useState("all")

  const initialNodes: Node[] = useMemo(() => 
    mockTasks.map((task, index) => ({
      id: task.id,
      type: "task",
      position: { 
        x: (index % 3) * 280 + 50, 
        y: Math.floor(index / 3) * 150 + 50 
      },
      data: {
        label: task.name,
        assignee: task.assignee,
        eta: task.eta,
        status: task.status,
        blockedBy: task.blockedBy.length,
        blocking: task.blocking.length,
      },
    })), [])

  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = []
    mockTasks.forEach((task) => {
      task.blocking.forEach((targetId) => {
        edges.push({
          id: `${task.id}-${targetId}`,
          source: task.id,
          target: targetId,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 2 },
          animated: mockTasks.find(t => t.id === targetId)?.status === "blocked",
        })
      })
    })
    return edges
  }, [])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const stats = useMemo(() => ({
    total: mockTasks.length,
    blocked: mockTasks.filter(t => t.status === "blocked").length,
    active: mockTasks.filter(t => t.status === "active").length,
    criticalPath: 3,
  }), [])

  return (
    <div className="p-6 h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dependencies</h1>
          <p className="text-muted-foreground">
            Visualize task dependencies and critical paths
          </p>
        </div>
        <Select value={project} onValueChange={setProject}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            <SelectItem value="phoenix">Project Phoenix</SelectItem>
            <SelectItem value="atlas">Project Atlas</SelectItem>
            <SelectItem value="nebula">Project Nebula</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-600">{stats.blocked}</p>
            <p className="text-xs text-muted-foreground">Blocked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-orange-600">{stats.criticalPath}</p>
            <p className="text-xs text-muted-foreground">Critical Path</p>
          </CardContent>
        </Card>
      </div>

      {/* Graph */}
      <Card className="flex-1">
        <CardContent className="p-0 h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            className="bg-muted/30"
          >
            <Background gap={20} size={1} />
            <Controls />
          </ReactFlow>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Blocked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-stone-400" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-2 ml-auto text-muted-foreground">
          <span>→ Dependency flow</span>
          <span className="text-red-500">⟿ Blocking relationship</span>
        </div>
      </div>
    </div>
  )
}
