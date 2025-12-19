"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Calendar, 
  Clock, 
  Users, 
  Video,
  Coffee,
  Code,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

const todaySchedule = [
  { time: "09:00", title: "Daily Standup", type: "meeting", duration: 30 },
  { time: "10:00", title: "Deep Work: API Development", type: "focus", duration: 120 },
  { time: "12:00", title: "Lunch Break", type: "break", duration: 60 },
  { time: "13:00", title: "Sprint Planning", type: "meeting", duration: 90 },
  { time: "14:30", title: "Code Review: PR #234", type: "focus", duration: 60 },
  { time: "16:00", title: "1:1 with Manager", type: "meeting", duration: 30 },
  { time: "16:30", title: "Deep Work: Bug Fixes", type: "focus", duration: 90 },
]

const weekAvailability = [
  { day: "Mon", available: 4, meetings: 3, focus: 2 },
  { day: "Tue", available: 5, meetings: 2, focus: 3 },
  { day: "Wed", available: 3, meetings: 4, focus: 1 },
  { day: "Thu", available: 6, meetings: 1, focus: 4 },
  { day: "Fri", available: 5, meetings: 2, focus: 2 },
]

function getTypeIcon(type: string) {
  switch (type) {
    case "meeting": return Video
    case "focus": return Code
    case "break": return Coffee
    default: return Clock
  }
}

function getTypeStyle(type: string) {
  switch (type) {
    case "meeting":
      return "border-l-blue-500 bg-blue-50 dark:bg-blue-900/20"
    case "focus":
      return "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
    case "break":
      return "border-l-orange-500 bg-orange-50 dark:bg-orange-900/20"
    default:
      return "border-l-stone-400 bg-stone-50 dark:bg-stone-800/20"
  }
}

export default function CalendarPage() {
  const stats = {
    availableToday: 4.5,
    meetingsToday: 3,
    focusTimeToday: 4.5,
    totalWeekAvailable: weekAvailability.reduce((acc, d) => acc + d.available, 0),
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">
            View your schedule and availability
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline">Today</Button>
          <Button variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/20">
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.availableToday}h</p>
                <p className="text-sm text-muted-foreground">Available Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <Video className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.meetingsToday}</p>
                <p className="text-sm text-muted-foreground">Meetings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Code className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.focusTimeToday}h</p>
                <p className="text-sm text-muted-foreground">Focus Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalWeekAvailable}h</p>
                <p className="text-sm text-muted-foreground">Week Availability</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Schedule */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Today's Schedule</CardTitle>
                <CardDescription>Thursday, December 18, 2024</CardDescription>
              </div>
              <Button variant="outline" size="sm">Add Event</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaySchedule.map((event, i) => {
                const Icon = getTypeIcon(event.type)
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-4 p-3 rounded-lg border-l-4 ${getTypeStyle(event.type)}`}
                  >
                    <div className="text-sm font-medium w-14 text-muted-foreground">
                      {event.time}
                    </div>
                    <div className="p-2 rounded-lg bg-background">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.duration} min</p>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {event.type}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Week Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Week Overview</CardTitle>
            <CardDescription>Hours distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {weekAvailability.map((day) => (
              <div key={day.day}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium">{day.day}</span>
                  <span className="text-muted-foreground">{day.available}h available</span>
                </div>
                <div className="flex gap-1 h-3">
                  <div 
                    className="bg-blue-500 rounded-l"
                    style={{ width: `${(day.meetings / 8) * 100}%` }}
                    title={`${day.meetings}h meetings`}
                  />
                  <div 
                    className="bg-emerald-500"
                    style={{ width: `${(day.focus / 8) * 100}%` }}
                    title={`${day.focus}h focus`}
                  />
                  <div 
                    className="bg-stone-200 dark:bg-stone-700 rounded-r flex-1"
                    title={`${day.available}h available`}
                  />
                </div>
              </div>
            ))}
            <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-500" />
                Meetings
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                Focus
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-stone-200 dark:bg-stone-700" />
                Available
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Status */}
      <Card className="border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/10">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <div>
              <p className="font-medium text-sm">Calendar not connected</p>
              <p className="text-xs text-muted-foreground">Connect Google Calendar to sync your schedule</p>
            </div>
          </div>
          <Button size="sm">Connect Calendar</Button>
        </CardContent>
      </Card>
    </div>
  )
}
