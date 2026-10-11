import "server-only"

import { auth } from "@clerk/nextjs/server"

import { db } from "@/lib/db"

// One of the signed-in user's chats with its first bot, or undefined if the
// chat doesn't exist or belongs to someone else.
export async function getChat(chatId: string) {
  const { userId } = await auth.protect()

  return db.query.chats.findFirst({
    where: (chats, { and, eq }) =>
      and(eq(chats.id, chatId), eq(chats.userId, userId)),
    with: {
      members: {
        orderBy: (members, { asc }) => [asc(members.joinedAt)],
        limit: 1,
        columns: {},
        with: {
          bot: {
            columns: {
              id: true,
              name: true,
              avatar: true,
              job: true,
              instruction: true,
            },
          },
        },
      },
    },
  })
}

export type ChatDetail = NonNullable<Awaited<ReturnType<typeof getChat>>>
