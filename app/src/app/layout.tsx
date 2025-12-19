import type { Metadata } from "next"
import "./globals.css"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "WorkLens AI",
  description: "Enterprise Workload, Risk & Delivery Intelligence Platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="flex-1" />
            </header>
            <main className="flex-1 overflow-auto">
        {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  )
}
