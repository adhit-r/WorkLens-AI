"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Bell, 
  Calendar, 
  Mail, 
  Shield, 
  Palette,
  Check,
  ExternalLink,
  Plug,
  ChevronRight,
  Sparkles,
  Bot
} from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
          <CardDescription>Account information and role</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-semibold text-primary">
              AD
            </div>
            <div>
              <h3 className="font-semibold">Adhithya</h3>
              <p className="text-sm text-muted-foreground">Tech Lead</p>
              <p className="text-sm text-muted-foreground">adhithya@company.com</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto">
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </CardTitle>
          <CardDescription>Configure how you receive alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Daily AI Digest</p>
              <p className="text-xs text-muted-foreground">Get a summary of insights every morning</p>
            </div>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Check className="h-3 w-3 mr-1" />
              Enabled
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Risk Alerts</p>
              <p className="text-xs text-muted-foreground">Notify when tasks become at-risk</p>
            </div>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Check className="h-3 w-3 mr-1" />
              Enabled
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Overload Warnings</p>
              <p className="text-xs text-muted-foreground">Alert when bandwidth exceeds 85%</p>
            </div>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Check className="h-3 w-3 mr-1" />
              Enabled
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* AI Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Provider
          </CardTitle>
          <CardDescription>Choose your AI model for chatbot and insights</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/ai" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Bot className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-sm">AI Settings</p>
                <p className="text-xs text-muted-foreground">Gemini, Ollama (local), Claude, OpenAI</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plug className="h-4 w-4" />
            Integrations
          </CardTitle>
          <CardDescription>Connect Mantis, Jira, and HRMS</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/settings/integrations" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plug className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Manage Integrations</p>
                <p className="text-xs text-muted-foreground">Connect issue trackers and HRMS</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Google Calendar</p>
                <p className="text-xs text-muted-foreground">Sync meetings and availability</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Connect
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Mail className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Send daily digest via email</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Check className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </CardTitle>
          <CardDescription>Customize the look and feel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Theme</p>
              <p className="text-xs text-muted-foreground">Choose your preferred color scheme</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Light</Button>
              <Button size="sm">Dark</Button>
              <Button variant="outline" size="sm">System</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Data & Privacy
          </CardTitle>
          <CardDescription>Manage your data and privacy settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Export Data</p>
              <p className="text-xs text-muted-foreground">Download all your data</p>
            </div>
            <Button variant="outline" size="sm">Export</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-red-600">Delete Account</p>
              <p className="text-xs text-muted-foreground">Permanently delete your account</p>
            </div>
            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
