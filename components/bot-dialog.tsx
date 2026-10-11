"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ShuffleIcon } from "lucide-react"
import { nanoid } from "nanoid"
import { Controller, useForm } from "react-hook-form"
import type { z } from "zod"

import { createBot } from "@/actions/bot"
import { ChatAvatar } from "@/components/chat-avatar"
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
import { insertBotSchema } from "@/lib/db/schema"

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

function emptyBot(): BotFormValues {
  return { name: "", avatar: nanoid(), job: "", instruction: "" }
}

function BotDialog({
  children,
  open: openProp,
  onOpenChange,
}: {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = openProp ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen
  const [isPending, startTransition] = React.useTransition()

  const form = useForm({
    resolver: zodResolver(insertBotSchema),
    defaultValues: emptyBot(),
  })

  function onSubmit(values: z.output<typeof insertBotSchema>) {
    startTransition(async () => {
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
        <DialogTrigger render={<Button variant="secondary" />}>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New bot</DialogTitle>
          <DialogDescription>
            Give it a face, a name, and a job to do.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
          <FieldGroup>
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
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner data-icon="inline-start" />}
              Create bot
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { BotDialog }
