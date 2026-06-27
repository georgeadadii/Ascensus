"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  SendIcon,
  TerminalIcon,
  Grip,
  CogIcon,
  PersonStanding,
  Apple,
  Dumbbell,
  BedDouble,
  BookCheck,
  Brain,
  NotebookPen,
} from "lucide-react"

const data = {
  navMain: [
    {
      title: "Overview",
      url: "/overview",
      icon: <Grip />,
    },
    {
      title: "Body",
      url: "/body",
      icon: <PersonStanding />,
    },
    {
      title: "Nutrition",
      url: "/nutrition",
      icon: <Apple />,
    },
    {
      title: "Training",
      url: "/training",
      icon: <Dumbbell />,
    },
    {
      title: "Sleep",
      url: "/sleep",
      icon: <BedDouble />,
    },
    {
      title: "Habits",
      url: "/habits",
      icon: <BookCheck />,
    },
    {
      title: "Insights",
      url: "/insights",
      icon: <Brain />,
    },
    {
      title: "Journal",
      url: "/journal",
      icon: <NotebookPen />,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: <CogIcon />,
    },
    {
      title: "Feedback",
      url: "/feedback",
      icon: <SendIcon />,
    },
  ],
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string | null
    email: string
    image: string | null
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/overview">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <TerminalIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Ascensus</span>
                  <span className="truncate text-xs">Overview home</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user.name ?? "Anonymous",
            email: user.email,
            avatar: user.image ?? "",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
