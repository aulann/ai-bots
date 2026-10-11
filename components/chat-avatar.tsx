import Image from "next/image"
import { Avatar, Style } from "@dicebear/core"
import dylanDefinition from "@dicebear/styles/dylan.json"
import { cn } from "cn"

const dylan = new Style(dylanDefinition)

// DiceBear "Pastel Wall" preset
const pastelWall = {
  backgroundColor: ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf", "d9f2d9"],
}

function ChatAvatar({
  seed,
  animated = false,
  className,
}: {
  seed: string
  animated?: boolean
  className?: string
}) {
  const src = new Avatar(dylan, {
    ...pastelWall,
    seed,
    tags: animated ? "animation" : undefined,
  }).toDataUri()

  return (
    <Image
      src={src}
      alt=""
      width={32}
      height={32}
      unoptimized
      data-slot="chat-avatar"
      className={cn("size-8 shrink-0 rounded-full", className)}
    />
  )
}

export { ChatAvatar }
