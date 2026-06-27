"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
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
  TerminalSquareIcon,
  BotIcon,
  BookOpenIcon,
  Settings2Icon,
  LifeBuoyIcon,
  SendIcon,
  FrameIcon,
  PieChartIcon,
  MapIcon,
  TerminalIcon,
  Grip,
  CogIcon,
} from "lucide-react"

const data = {
  navMain: [
    {
      title: "Overview",
      url: "#",
      icon: <Grip />,
    },
    {
      title: "Body",
      url: "#",
      icon: <BotIcon />,
    },
    {
      title: "Nutrition",
      url: "#",
      icon: <BookOpenIcon />,
    },
    {
      title: "Training",
      url: "#",
      icon: <Settings2Icon />,
    },
    {
      title: "Sleep",
      url: "#",
      icon: <Settings2Icon />,
    },
    {
      title: "Habits",
      url: "#",
      icon: <Settings2Icon />,
    },
    {
      title: "Insights",
      url: "#",
      icon: <Settings2Icon />,
    },
    {
      title: "Journal",
      url: "#",
      icon: <Settings2Icon />,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: <CogIcon />,
    },
    {
      title: "Feedback",
      url: "#",
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
              <a href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <TerminalIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Ascensus</span>
                  <span className="truncate text-xs">Dashboard home</span>
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
