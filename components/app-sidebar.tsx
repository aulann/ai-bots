import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"

import { ChatAvatar } from "@/components/chat-avatar"
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
} from "@/components/ui/sidebar"
import { getChats } from "@/queries/bots"

export async function AppSidebar() {
  const chats = await getChats()

  return (
    <Sidebar>
      <SidebarHeader className="flex-row justify-end">
        <NewChatMenu />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.map((chat) => {
                // Group chats aren't handled yet, so fall back to the first bot.
                const bot = chat.members[0]?.bot
                return (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      size="lg"
                      render={<Link href={`/chats/${chat.id}`} />}
                    >
                      <ChatAvatar seed={bot?.avatar ?? chat.id} />
                      <div className="grid min-w-0 flex-1 gap-0.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-medium">
                            {chat.name ?? bot?.name}
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
    </Sidebar>
  )
}
