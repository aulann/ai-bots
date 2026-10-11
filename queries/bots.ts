import "server-only"

import { auth } from "@clerk/nextjs/server"

import { db } from "@/lib/db"

// The signed-in user's chats, most recent first, each with its first bot.
export async function getChats() {
  const { userId } = await auth.protect()

  return db.query.chats.findMany({
    where: (chats, { eq }) => eq(chats.userId, userId),
    orderBy: (chats, { desc }) => [desc(chats.lastMessageAt)],
    with: {
      members: {
        orderBy: (members, { asc }) => [asc(members.joinedAt)],
        limit: 1,
        columns: {},
        with: { bot: { columns: { name: true, avatar: true } } },
      },
    },
  })
}

export type ChatListItem = Awaited<ReturnType<typeof getChats>>[number]
