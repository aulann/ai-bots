import { MonitorIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import type { ChatDetail } from "@/queries/chats"

export function ChatHeader({ chat }: { chat: ChatDetail }) {
  // Group chats aren't handled yet, so fall back to the first bot.
  const bot = chat.members[0]?.bot
  const name = chat.name ?? bot?.name

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b pr-4 pl-5">
      {bot ? (
        <h1 className="-ml-3 min-w-0">
          <BotDialog
            bot={bot}
            variant="ghost"
            className="h-10 max-w-full gap-3.5 px-3 hover:bg-foreground/10 aria-expanded:bg-foreground/10 dark:hover:bg-foreground/10"
          >
            <ChatAvatar seed={bot.avatar} className="size-6" />
            <span className="truncate">{name}</span>
          </BotDialog>
        </h1>
      ) : (
        <>
          <ChatAvatar seed={chat.id} className="size-6" />
          <h1 className="truncate">{name}</h1>
        </>
      )}
      <Button variant="ghost" size="icon-sm" className="-mr-1.5 ml-auto">
        <MonitorIcon className="size-5" />
        <span className="sr-only">Desktop</span>
      </Button>
    </header>
  )
}
