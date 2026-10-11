"use client"

import { UserButton } from "@clerk/nextjs"

import {
  SidebarMenu,
  SidebarMenuItem,
  sidebarMenuButtonVariants,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavUser() {
  const { state, isMobile } = useSidebar()
  const collapsed = state === "collapsed" && !isMobile

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <UserButton
          showName={!collapsed}
          appearance={{
            elements: collapsed
              ? {
                  // Icon rail: a plain square button holding a round avatar.
                  rootBox: "flex w-full justify-center",
                  userButtonTrigger:
                    "flex size-10! shrink-0 items-center justify-center rounded-md p-0! hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  userButtonBox: "flex size-8! items-center justify-center",
                  userButtonAvatarBox:
                    "aspect-square size-8! min-w-8! shrink-0 overflow-hidden rounded-full!",
                  userButtonAvatarImage: "size-full! rounded-full! object-cover",
                }
              : {
                  rootBox: "flex w-full",
                  userButtonTrigger: sidebarMenuButtonVariants({ size: "lg" }),
                  userButtonBox:
                    "w-full min-w-0 flex-row-reverse items-center justify-end gap-3",
                  userButtonAvatarBox: "size-7 shrink-0 rounded-full",
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
