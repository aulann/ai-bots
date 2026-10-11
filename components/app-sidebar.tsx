import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"

import { ChatAvatar } from "@/components/chat-avatar"
import { ChatSearch } from "@/components/chat-search"
import { NavUser } from "@/components/nav-user"
import { NewChatMenu } from "@/components/new-chat-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { getChats } from "@/queries/bots"

export async function AppSidebar() {
  const chats = await getChats()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex justify-end group-data-[collapsible=icon]:justify-center">
          <NewChatMenu />
        </div>
        <ChatSearch chats={chats} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {chats.map((chat) => {
                // Group chats aren't handled yet, so fall back to the first bot.
                const bot = chat.members[0]?.bot
                const name = chat.name ?? bot?.name
                return (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      size="lg"
                      tooltip={name}
                      render={<Link href={`/chats/${chat.id}`} />}
                    >
                      <ChatAvatar seed={bot?.avatar ?? chat.id} />
                      <div className="grid min-w-0 flex-1 gap-0.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-medium">
                            {name}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatDistanceToNowStrict(chat.lastMessageAt)}
                          </span>
                        </div>
                        {chat.lastMessagePreview && (
                          <span className="truncate text-xs text-muted-foreground">
                            {chat.lastMessagePreview}
                          </span>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
