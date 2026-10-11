"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ShuffleIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { nanoid } from "nanoid"
import { Controller, useForm } from "react-hook-form"
import type { z } from "zod"

import { createBot, deleteBot, updateBot } from "@/actions/bot"
import { ChatAvatar } from "@/components/chat-avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { insertBotSchema, type Bot } from "@/lib/db/schema"

type BotFormValues = z.input<typeof insertBotSchema>

const presets = [
  {
    name: "Ada",
    job: "Research assistant",
    instruction:
      "Answer briefly, cite sources, and ask before running anything destructive.",
  },
  {
    name: "Linus",
    job: "Code reviewer",
    instruction:
      "Point out bugs first, then readability. Suggest concrete fixes with code.",
  },
  {
    name: "Maya",
    job: "Writing editor",
    instruction:
      "Tighten the prose, keep the author's voice, and explain each larger change.",
  },
  {
    name: "Sage",
    job: "Tutor",
    instruction:
      "Teach step by step, check understanding with questions, and never just hand over answers.",
  },
]

type EditableBot = Pick<Bot, "id" | "name" | "avatar" | "job" | "instruction">

function emptyBot(): BotFormValues {
  return { name: "", avatar: nanoid(), job: "", instruction: "" }
}

function botValues(bot: EditableBot): BotFormValues {
  return {
    name: bot.name,
    avatar: bot.avatar,
    job: bot.job,
    instruction: bot.instruction ?? "",
  }
}

// Creates a bot, or edits `bot` when one is passed.
function BotDialog({
  bot,
  children,
  variant = "secondary",
  className,
  open: openProp,
  onOpenChange,
}: {
  bot?: EditableBot
  children?: React.ReactNode
  variant?: React.ComponentProps<typeof Button>["variant"]
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = openProp ?? uncontrolledOpen
  const setOpenState = onOpenChange ?? setUncontrolledOpen
  const [isPending, startTransition] = React.useTransition()

  const form = useForm({
    resolver: zodResolver(insertBotSchema),
    defaultValues: bot ? botValues(bot) : emptyBot(),
  })

  function setOpen(next: boolean) {
    // Opening the edit dialog always starts from the saved bot, not a
    // cancelled draft.
    if (next && bot) form.reset(botValues(bot))
    setOpenState(next)
  }

  function onSubmit(values: z.output<typeof insertBotSchema>) {
    startTransition(async () => {
      if (bot) {
        const result = await updateBot(bot.id, values)

        if (!result.success) {
          toast.add({ type: "error", title: result.error })
          return
        }

        toast.add({ type: "success", title: `${result.bot.name} is updated.` })
        setOpen(false)
        form.reset(botValues(result.bot))
        return
      }

      const result = await createBot(values)

      if (!result.success) {
        toast.add({ type: "error", title: result.error })
        return
      }

      toast.add({ type: "success", title: `${result.bot.name} is ready.` })
      setOpen(false)
      form.reset(emptyBot())
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && (
        <DialogTrigger
          render={<Button variant={variant} className={className} />}
        >
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{bot ? "Edit bot" : "New bot"}</DialogTitle>
          <DialogDescription>
            {bot
              ? "Change its face, name, or how it works."
              : "Give it a face, a name, and a job to do."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
          <FieldGroup>
            {!bot && (
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <Button
                    key={preset.job}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() =>
                      form.reset({
                        ...preset,
                        avatar: form.getValues("avatar"),
                      })
                    }
                  >
                    {preset.job}
                  </Button>
                ))}
              </div>
            )}
            <Controller
              name="avatar"
              control={form.control}
              render={({ field }) => (
                <Field orientation="horizontal">
                  <ChatAvatar seed={field.value} className="size-10" />
                  <FieldContent>
                    <FieldTitle>Face</FieldTitle>
                    <FieldDescription>
                      Shuffle until you find one you like.
                    </FieldDescription>
                  </FieldContent>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => field.onChange(nanoid())}
                  >
                    <ShuffleIcon data-icon="inline-start" />
                    Shuffle
                  </Button>
                </Field>
              )}
            />
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="bot-name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="bot-name"
                    placeholder="Ada"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="job"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="bot-job">Job</FieldLabel>
                  <Input
                    {...field}
                    id="bot-job"
                    placeholder="Research assistant"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="instruction"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="bot-instruction">
                    How it should work
                  </FieldLabel>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    id="bot-instruction"
                    placeholder="Answer briefly, cite sources, and ask before running anything destructive."
                    className="min-h-20"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            {bot && (
              <DeleteBotButton
                bot={bot}
                onDeleted={() => setOpenState(false)}
              />
            )}
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner data-icon="inline-start" />}
              {bot ? "Save changes" : "Create bot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteBotButton({
  bot,
  onDeleted,
}: {
  bot: EditableBot
  onDeleted: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  function onDelete() {
    startTransition(async () => {
      const result = await deleteBot(bot.id)

      if (!result.success) {
        toast.add({ type: "error", title: result.error })
        return
      }

      toast.add({ type: "success", title: `${result.bot.name} is deleted.` })
      setOpen(false)
      onDeleted()
      // The chat we're on was deleted with the bot.
      router.push("/")
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="destructive" className="sm:mr-auto" />
        }
      >
        <Trash2Icon data-icon="inline-start" />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {bot.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the bot and its chat. You can&apos;t undo this.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={onDelete}
          >
            {isPending && <Spinner data-icon="inline-start" />}
            Delete bot
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { BotDialog }
