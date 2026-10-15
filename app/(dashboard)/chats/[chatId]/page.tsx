import { notFound } from "next/navigation"

import { Chat } from "@/components/chat"
import { ChatHeader } from "@/components/chat-header"
import { DesktopPanel, DesktopPanelProvider } from "@/components/desktop-panel"
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { getChat } from "@/queries/chats"

export default async function Page(props: PageProps<"/chats/[chatId]">) {
  const { chatId } = await props.params
  const chat = await getChat(chatId)
  if (!chat) notFound()

  return (
    <DesktopPanelProvider
      chatId={chat.id}
      name={chat.name ?? chat.members[0]?.bot.name ?? "Bot"}
    >
      {/* The group sets an inline height: 100%, so it needs a sized parent. */}
      <div className="h-svh">
        <ResizablePanelGroup>
          <ResizablePanel id="chat" minSize="25" className="relative">
            {/* Out of the flow, so wide messages (screenshots, terminal
                output) can't stretch the panel and push the desktop away. */}
            <div className="absolute inset-0 flex flex-col">
              <ChatHeader chat={chat} />
              <Chat key={chat.id} id={chat.id} />
            </div>
          </ResizablePanel>
          <DesktopPanel />
        </ResizablePanelGroup>
      </div>
    </DesktopPanelProvider>
  )
}
