# Supabase → Drizzle conversion guide

How each `supabase.*` call site was converted. Kept for reviewers and for
anyone converting code later.

## Imports

```ts
import { and, asc, count, desc, eq, gte, inArray, isNotNull, lt, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";                       // server-only Drizzle client (no RLS!)
import { lessons, submissions /* … */ } from "@/db/schema";
import { getAppUser, isAdmin, hasAccess } from "@/lib/auth/session";
import { requireUser, requireAdmin } from "@/lib/auth/require-user"; // pages/layouts only
import { uploadObject, removeObjects, createSignedUrl, publicUrl } from "@/lib/storage/r2";
```

Schema exports (TS props are camelCase, DB columns snake_case):
`usersInAuth` (auth.users), `profiles`, `lessons`, `rubrics`, `prompts`,
`purchases`, `quizItems`, `quizAttempts`, `quizItemSeen`, `lessonProgress`,
`gateStatus`, `submissions`, `rubricScores`, `auditQueue`, `auditRecords`,
`lessonTemplates`, `capstoneScenarios`, `capstoneAttempts`, `capstoneArtifacts`,
`mockInterviewScenarios`, `mockInterviewResponses`, `workbookAssignments`,
`workbookAssignmentSeen`, `tutorMessages`, `learningActivity`.

Column types: timestamps are ISO strings, numerics are `number`, jsonb is
`unknown` (cast at the boundary as the old code did), enums are string unions.

## Auth replacements

| Old | New |
|---|---|
| `const { data: { user } } = await supabase.auth.getUser(); if (!user) …` (actions, route handlers, components) | `const user = await getAppUser(); if (!user) …` — `user.id` is the app/auth.users uuid, `user.email` is set |
| `requireUser()` / `requireAdmin()` | unchanged API; now return `AppUser` |
| `supabase.rpc("is_admin")` | `await isAdmin(user.id)` |
| `auth.admin.getUserById(id)` for an email | `select email from profiles where id = …` |

Local `requireAdmin()` helpers inside admin action files keep their return
shape (`UNAUTHENTICATED` / `FORBIDDEN` codes) but use `getAppUser` + `isAdmin`.

## Access control — RLS is gone

`createClient()` (user-scoped) used to be filtered by RLS. **Every query that
used it must now filter explicitly.** `createAdminClient()` queries map 1:1
(they already bypassed RLS) — but keep/verify any ownership check the code did.

| Table | Rule to enforce in code (was RLS) |
|---|---|
| profiles | read own row (`id = user.id`); users may update ONLY `full_name` (+ `weekly_digest_opt_in` where the old code did); admins all |
| lessons | learners: `is_published = true` AND `hasAccess(user.id)`; admins see all |
| rubrics | `is_current = true` AND `hasAccess`; admins all |
| prompts, quiz_items (full row), audit_queue | server/admin only. Never send `quiz_items.correct` / `distractor_rationale` to a learner |
| quiz_items_public (view) | query `quizItems` with an explicit projection WITHOUT `correct`/`distractor_rationale`, and require `hasAccess` |
| submissions, lesson_progress, quiz_attempts, quiz_item_seen, gate_status, purchases, tutor_messages, capstone_attempts, capstone_artifacts, mock_interview_responses, workbook_assignment_seen, learning_activity | owner only: `eq(table.userId, user.id)` on every read/update/delete; inserts set `userId: user.id` from the session, never from input |
| rubric_scores | owner via `submissions.user_id` (join/filter on the submission you already checked) |
| audit_records | admins; learner may read records for their own submission |
| capstone_scenarios | published AND `hasAccess` (admins all) |
| mock_interview_scenarios | published, any signed-in user |
| workbook_assignments, lesson_templates | any signed-in user |

When a query fetches a row by id from user input (e.g. `/submissions/[id]`),
add `userId = user.id` to the WHERE (unless admin) so another user's id
returns "not found".

## Query shapes

Keep downstream code unchanged by aliasing to the old snake_case names:

```ts
const rows = await db
  .select({ id: lessons.id, video_url: lessons.videoUrl })
  .from(lessons)
  .where(and(eq(lessons.slug, slug), eq(lessons.isPublished, true)))
  .limit(1);
const lesson = rows[0] ?? null;          // replaces .maybeSingle()
```

- `.single()` → `const [row] = …; if (!row) …`
- `{ count: "exact", head: true }` → `db.select({ n: count() }).from(t).where(…)` → `Number(n)`
- `.upsert(v, { onConflict: "a,b" })` → `.insert(t).values(v).onConflictDoUpdate({ target: [t.a, t.b], set: {…} })`
- `.update(…).eq("id", x)` → `db.update(t).set({…}).where(eq(t.id, x))`
- `.in("id", ids)` → `inArray(t.id, ids)` (guard `ids.length > 0`)
- `.rpc("user_streak", { p_user_id })` → `db.execute(sql\`select public.user_streak(${id}) as streak\`)` (returns integer)
- `.rpc("search_lessons", { q })` → `db.execute(sql\`select * from public.search_lessons(${q})\`)`
- Supabase returned `{ data, error }` and never threw; Drizzle throws. Where the
  old code handled `error` and returned an `ActionResult`, wrap in try/catch
  and return the same `code` (actions must not throw — CLAUDE.md rule 7).

## Storage → R2

Same bucket names, now key prefixes in one private R2 bucket:
`uploadObject(bucket, path, buffer, contentType)`, `removeObjects(bucket, [path])`,
`createSignedUrl(bucket, path, seconds)`, `publicUrl(bucket, path)` (only
`lesson-videos` / `lesson-templates`). All return `{ error }` or `null` like
Supabase — no throws.
