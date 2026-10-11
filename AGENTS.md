<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Git

- Never create branches, worktrees, or commits automatically. Only do so when the user explicitly asks for that specific action in the current request.
- Leave changes uncommitted in the workingtree on the current branch and let the user decide when and how to commit.

## Database

- Apply schema changes only with `npm run db:push` (`drizzle-kit push`). Never generate or run migrations (`drizzle-kit generate`, `drizzle-kit migrate`, or migration files/folders).
- This is a development project. There is no backwards compatibility and the data is worthless. Prefer data loss: never backfill, migrate, or preserve existing rows, and never spend effort on keeping old data working. Every schema change means a clean slate.

## Forms

Reference implementation: `lib/db/schema.ts` (`insertBotSchema`), `actions/bot.ts` (`createBot`), `components/bot-dialog.tsx`.

- **One schema, shared by client and server.** Generate it from the Drizzle table with `createInsertSchema` from `drizzle-zod`, next to the table in `lib/db/schema.ts`. Name it `insert<Table>Schema` and export its type (`z.infer`). Never hand-write a parallel Zod schema for a table.
- **Refine and narrow in the schema.** Put trim, length limits and user-facing error messages in the refinement callbacks, e.g. `name: (s) => s.trim().min(1, "Give your bot a name.")`. Then `.pick()` only the fields the user fills in. Server-owned fields (`id`, `userId`, `createdAt`, sandbox IDs) must never be in the schema, so a client can't set them. Use `.required({ field: true })` for columns that have a DB default but that the form must always send.
- **Server actions live in `actions/<entity>.ts`** with `"use server"`. In each action, in this order:
  1. `const { userId } = await auth.protect()` (Clerk). Take `userId` from the session, never from the input.
  2. `safeParse` the input with the same schema. Server actions are public endpoints.
  3. Write with Drizzle via `db` from `@/lib/db`, then `revalidatePath` the affected route.
  4. Return `{ success: true, <entity> } | { success: false, error: string }`. Don't throw for validation errors.
- **Store empty optional text as `null`** (`instruction: parsed.data.instruction || null`).
- **Client forms use `react-hook-form` + `zodResolver(schema)`** in a `"use client"` component. Type values with `z.input<typeof schema>` and the submit handler with `z.output<typeof schema>`. Use a factory like `emptyBot()` for `defaultValues`, and reuse it in `form.reset()` after a successful submit.
- **Render each field with `Controller` and shadcn `Field` components**: `FieldGroup` > `Field data-invalid={fieldState.invalid}` > `FieldLabel htmlFor` + control with `aria-invalid={fieldState.invalid}` + `{fieldState.invalid && <FieldError errors={[fieldState.error]} />}`. Nullable columns need `value={field.value ?? ""}` on the input.
- **Submit with `useTransition`.** Call the action inside `startTransition`, disable the submit button while `isPending` and show `<Spinner data-icon="inline-start" />`. Report the result with `toast.add({ type, title })` from `@/components/ui/toast` (Base UI, not sonner).
- **Forms in dialogs:** keep the dialog's open state controlled (`open`/`onOpenChange`) so it can close on success. Put `DialogHeader` outside the `<form>` and give the form `className="contents"`, so `DialogFooter` still lines up with the dialog edges. Cancel is `DialogClose render={<Button variant="outline" />}`, and every non-submit button inside the form needs `type="button"`.
- **Server pages open client dialogs through a wrapper component** that renders its own `DialogTrigger render={<Button />}` and takes the trigger label as `children`. Keep the page a Server Component.

## DiceBear

Use DiceBear 10. Documentation: https://www.dicebear.com/llms.txt

There are seven native cores with identical output, not one library with
wrappers. Use the one matching this project's language. Do not reach for the
JavaScript core when the project is written in something else:

    JavaScript  @dicebear/core + @dicebear/styles
    PHP         dicebear/core + dicebear/styles
    Python      dicebear-core + dicebear-styles
    Rust        dicebear-core + dicebear-styles
    Go          github.com/dicebear/dicebear-go/v10 + github.com/dicebear/styles/v10
    Dart        dicebear_core + dicebear_styles
    C#          DiceBear.Core + DiceBear.Styles

Every style page carries a loading snippet for all seven, for example
https://www.dicebear.com/styles/lorelei/index.md

HTTP API: https://api.dicebear.com/10.x/<style>/svg?seed=<seed> The seed is a
query parameter, not a path segment. Options are query parameters too; array
values are separated by commas.

Options named after a component end in Variant: eyesVariant, not eyes. This
holds in all seven cores and in the HTTP API. Look up the options of a style at
https://api.dicebear.com/10.x/<style>/options.json

Write these forms, not the ones on the left. The left column is pre-10 and the
API does not reject it, so an outdated call runs and silently does the wrong
thing:

    avatars.dicebear.com/api/<style>/<seed>.svg  ->  api.dicebear.com/10.x/<style>/svg?seed=<seed>
    api.dicebear.com/9.x/<style>/svg             ->  api.dicebear.com/10.x/<style>/svg
    npm install @dicebear/collection             ->  npm install @dicebear/styles
    npm install @dicebear/lorelei                ->  npm install @dicebear/styles
    createAvatar(lorelei, { seed })              ->  new Avatar(new Style(definition), { seed })
    { eyes: ['variant01'] }                      ->  { eyesVariant: ['variant01'] }
    ?radius=50                                   ->  ?borderRadius=50

Only JavaScript and the HTTP API have a pre-10 form. The other six cores were
released in 2026 and never had one, so any older-looking PHP, Python, Rust, Go,
Dart or C# API attributed to DiceBear is invented rather than outdated.

<!-- TRIGGER.DEV SKILLS START -->
## Trigger.dev agent skills

This project has Trigger.dev agent skills installed in `.agents/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or chat.agent AI agents), load the most relevant skill: `trigger-realtime-and-frontend`, `trigger-authoring-chat-agent`, `trigger-authoring-tasks`, `trigger-chat-agent-advanced`, `trigger-cost-savings`, `trigger-getting-started`.
<!-- TRIGGER.DEV SKILLS END -->
