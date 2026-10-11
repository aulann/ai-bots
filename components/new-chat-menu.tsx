"use client"

import * as React from "react"
import { PlusIcon, UsersIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function NewChatMenu() {
  const [botDialogOpen, setBotDialogOpen] = React.useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" />}
          aria-label="New"
        >
          <PlusIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setBotDialogOpen(true)}>
            <PlusIcon />
            Create new bot
          </DropdownMenuItem>
          <DropdownMenuItem>
            <UsersIcon />
            Create group chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BotDialog open={botDialogOpen} onOpenChange={setBotDialogOpen} />
    </>
  )
}
