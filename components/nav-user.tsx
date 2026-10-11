"use client"

import { UserButton } from "@clerk/nextjs"

import {
  SidebarMenu,
  SidebarMenuItem,
  sidebarMenuButtonVariants,
} from "@/components/ui/sidebar"

export function NavUser() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <UserButton
          showName
          appearance={{
            elements: {
              rootBox: "flex w-full",
              userButtonTrigger: sidebarMenuButtonVariants({ size: "lg" }),
              userButtonBox:
                "w-full min-w-0 flex-row-reverse items-center justify-end gap-3",
              userButtonAvatarBox: "size-6 rounded-full",
              userButtonAvatarImage: "rounded-full",
              userButtonOuterIdentifier:
                "truncate ps-0 text-sm leading-none font-medium text-sidebar-foreground",
            },
          }}
        />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
