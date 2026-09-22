/**
 * Drizzle schema for the Neon database (project pc-launchpad).
 *
 * GENERATED — do not edit by hand. `pnpm db:pull` introspects Neon and
 * scripts/db-normalize-schema.mjs rewrites the result into this file. The
 * database is the source of truth; never push/migrate from this file.
 *
 * NOTE: RLS is disabled on every public table. Access control lives in
 * server code — every user-facing query must filter by the app user id.
 */
import {
  bigint,
  boolean,
  check,
  customType,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  pgTable,
  primaryKey,
  smallint,
  text,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/**
 * timestamptz read as an ISO-8601 string, matching what PostgREST/Supabase
 * returned (Postgres' own text form "2026-01-01 12:00:00+00" is not ISO and
 * trips up `.slice(0, 10)`-style code and some Date parsers).
 */
export function toIsoTimestamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const s = String(value)
    .replace(" ", "T")
    .replace(/([+-]\d\d)$/, "$1:00");
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

const timestamptz = customType<{ data: string; driverData: string | Date }>({
  dataType() {
    return "timestamp with time zone";
  },
  fromDriver(value) {
    return toIsoTimestamp(value);
  },
});

export const auth = pgSchema("auth");

export const aalLevelInAuth = auth.enum("aal_level", ["aal1", "aal2", "aal3"]);

export const codeChallengeMethodInAuth = auth.enum("code_challenge_method", ["s256", "plain"]);

export const factorStatusInAuth = auth.enum("factor_status", ["unverified", "verified"]);

export const factorTypeInAuth = auth.enum("factor_type", ["totp", "webauthn", "phone"]);

export const oauthAuthorizationStatusInAuth = auth.enum("oauth_authorization_status", [
  "pending",
  "approved",
  "denied",
  "expired",
]);

export const oauthClientTypeInAuth = auth.enum("oauth_client_type", ["public", "confidential"]);

export const oauthRegistrationTypeInAuth = auth.enum("oauth_registration_type", [
  "dynamic",
  "manual",
]);

export const oauthResponseTypeInAuth = auth.enum("oauth_response_type", ["code"]);

export const oneTimeTokenTypeInAuth = auth.enum("one_time_token_type", [
  "confirmation_token",
  "reauthentication_token",
  "recovery_token",
  "email_change_token_new",
  "email_change_token_current",
  "phone_change_token",
]);

export const auditReason = pgEnum("audit_reason", ["sampled", "requested"]);

export const auditStatus = pgEnum("audit_status", ["pending", "approved", "overridden"]);

export const industryTrack = pgEnum("industry_track", [
  "it_saas",
  "healthcare",
  "construction",
  "marketing",
]);

export const submissionStatus = pgEnum("submission_status", [
  "pending",
  "grading",
  "graded",
  "grading_failed",
  "manual_review",
]);

export const userRole = pgEnum("user_role", ["learner", "admin"]);

export const auditQueue = pgTable(
  "audit_queue",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    submissionId: uuid("submission_id").notNull(),
    reason: auditReason().notNull(),
    status: auditStatus().default("pending").notNull(),
    createdAt: timestamptz("created_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("audit_queue_status_idx")
      .using("btree", table.status.asc().nullsLast().op("enum_ops"))
      .where(sql`(status = 'pending'::audit_status)`),
    foreignKey({
      columns: [table.submissionId],
      foreignColumns: [submissions.id],
      name: "audit_queue_submission_id_fkey",
    }).onDelete("cascade"),
    unique("audit_queue_submission_id_key").on(table.submissionId),
  ]
);

export const auditRecords = pgTable(
  "audit_records",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    auditQueueId: uuid("audit_queue_id").notNull(),
    reviewerId: uuid("reviewer_id").notNull(),
    decision: auditStatus().notNull(),
    overrides: jsonb(),
    note: text(),
    decidedAt: timestamptz("decided_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("audit_records_queue_idx").using(
      "btree",
      table.auditQueueId.asc().nullsLast().op("timestamptz_ops"),
      table.decidedAt.desc().nullsFirst().op("timestamptz_ops")
    ),
    foreignKey({
      columns: [table.auditQueueId],
      foreignColumns: [auditQueue.id],
      name: "audit_records_audit_queue_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.reviewerId],
      foreignColumns: [usersInAuth.id],
      name: "audit_records_reviewer_id_fkey",
    }),
  ]
);

export const capstoneArtifacts = pgTable(
  "capstone_artifacts",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    attemptId: uuid("attempt_id").notNull(),
    userId: uuid("user_id").notNull(),
    kind: text().notNull(),
    filePath: text("file_path").notNull(),
    fileName: text("file_name").notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    fileSize: bigint("file_size", { mode: "number" }),
    contentType: text("content_type"),
    createdAt: timestamptz("created_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("capstone_artifacts_attempt_idx").using(
      "btree",
      table.attemptId.asc().nullsLast().op("text_ops"),
      table.kind.asc().nullsLast().op("text_ops")
    ),
    foreignKey({
      columns: [table.attemptId],
      foreignColumns: [capstoneAttempts.id],
      name: "capstone_artifacts_attempt_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersInAuth.id],
      name: "capstone_artifacts_user_id_fkey",
    }).onDelete("cascade"),
  ]
);

export const capstoneAttempts = pgTable(
  "capstone_attempts",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    scenarioId: uuid("scenario_id").notNull(),
    status: text().default("in_progress").notNull(),
    startedAt: timestamptz("started_at")
      .default(sql`now()`)
      .notNull(),
    submittedAt: timestamptz("submitted_at"),
    gradedAt: timestamptz("graded_at"),
    overallScore: numeric("overall_score", { mode: "number" }),
    pass: boolean(),
    feedbackSummary: text("feedback_summary"),
    notes: text(),
    createdAt: timestamptz("created_at")
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamptz("updated_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("capstone_attempts_user_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("timestamptz_ops"),
      table.startedAt.desc().nullsFirst().op("timestamptz_ops")
    ),
    foreignKey({
      columns: [table.scenarioId],
      foreignColumns: [capstoneScenarios.id],
      name: "capstone_attempts_scenario_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersInAuth.id],
      name: "capstone_attempts_user_id_fkey",
    }).onDelete("cascade"),
    check(
      "capstone_attempts_status_check",
      sql`status = ANY (ARRAY['in_progress'::text, 'submitted'::text, 'graded'::text, 'withdrawn'::text])`
    ),
  ]
);

export const capstoneScenarios = pgTable(
  "capstone_scenarios",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    slug: text().notNull(),
    title: text().notNull(),
    brief: text().notNull(),
    requiredArtifacts: text("required_artifacts")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    estimatedHours: integer("estimated_hours"),
    isPublished: boolean("is_published").default(false).notNull(),
    createdAt: timestamptz("created_at")
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamptz("updated_at")
      .default(sql`now()`)
      .notNull(),
    sort: integer().default(100).notNull(),
    rubricSummary: text("rubric_summary"),
  },
  (table) => [
    index("capstone_scenarios_sort_idx").using(
      "btree",
      table.sort.asc().nullsLast().op("int4_ops")
    ),
    unique("capstone_scenarios_slug_key").on(table.slug),
  ]
);

export const gateStatus = pgTable(
  "gate_status",
  {
    userId: uuid("user_id").primaryKey().notNull(),
    foundationComplete: boolean("foundation_complete").default(false).notNull(),
    portfolioComplete: boolean("portfolio_complete").default(false).notNull(),
    portfolioArtifactsCount: integer("portfolio_artifacts_count").default(0).notNull(),
    portfolioArtifactsTarget: integer("portfolio_artifacts_target").default(7).notNull(),
    interviewComplete: boolean("interview_complete").default(false).notNull(),
    industryComplete: boolean("industry_complete").default(false).notNull(),
    updatedAt: timestamptz("updated_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersInAuth.id],
      name: "gate_status_user_id_fkey",
    }).onDelete("cascade"),
  ]
);

export const learningActivity = pgTable(
  "learning_activity",
  {
    userId: uuid("user_id").notNull(),
    activityDate: date("activity_date").notNull(),
    eventsCount: integer("events_count").default(0).notNull(),
    createdAt: timestamptz("created_at")
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamptz("updated_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("learning_activity_user_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("date_ops"),
      table.activityDate.desc().nullsFirst().op("date_ops")
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersInAuth.id],
      name: "learning_activity_user_id_fkey",
    }).onDelete("cascade"),
    primaryKey({ columns: [table.activityDate, table.userId], name: "learning_activity_pkey" }),
  ]
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: uuid("user_id").notNull(),
    lessonId: uuid("lesson_id").notNull(),
    videoSecondsWatched: integer("video_seconds_watched").default(0).notNull(),
    videoDuration: integer("video_duration"),
    videoWatched: boolean("video_watched").default(false).notNull(),
    quizPassed: boolean("quiz_passed").default(false).notNull(),
    artifactSubmitted: boolean("artifact_submitted").default(false).notNull(),
    updatedAt: timestamptz("updated_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("lesson_progress_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.lessonId],
      foreignColumns: [lessons.id],
      name: "lesson_progress_lesson_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersInAuth.id],
      name: "lesson_progress_user_id_fkey",
    }).onDelete("cascade"),
    primaryKey({ columns: [table.lessonId, table.userId], name: "lesson_progress_pkey" }),
  ]
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    slug: text().notNull(),
    number: integer().notNull(),
    title: text().notNull(),
    summary: text(),
    videoUrl: text("video_url"),
    scenarioText: text("scenario_text"),
    estimatedMinutes: integer("estimated_minutes"),
    isPublished: boolean("is_published").default(false).notNull(),
    createdAt: timestamptz("created_at")
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamptz("updated_at")
      .default(sql`now()`)
      .notNull(),
    competency: text().notNull(),
    promptName: text("prompt_name").notNull(),
    isPreview: boolean("is_preview").default(false).notNull(),
    searchText: tsvector("search_text").generatedAlwaysAs(
      sql`to_tsvector('english'::regconfig, ((((COALESCE(title, ''::text) || ' '::text) || COALESCE(summary, ''::text)) || ' '::text) || COALESCE(competency, ''::text)))`
    ),
  },
  (table) => [
    index("lessons_number_idx").using("btree", table.number.asc().nullsLast().op("int4_ops")),
    index("lessons_preview_idx")
      .using("btree", table.isPreview.asc().nullsLast().op("bool_ops"))
      .where(sql`(is_preview = true)`),
    index("lessons_published_idx")
      .using("btree", table.isPublished.asc().nullsLast().op("bool_ops"))
      .where(sql`(is_published = true)`),
    index("lessons_search_idx").using("gin", table.searchText.asc().nullsLast().op("tsvector_ops")),
    unique("lessons_slug_key").on(table.slug),
  ]
);

export const lessonTemplates = pgTable(
  "lesson_templates",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    lessonId: uuid("lesson_id").notNull(),
    title: text().notNull(),
    description: text(),
    fileUrl: text("file_url").notNull(),
    kind: text().notNull(),
    sort: integer().default(100).notNull(),
    createdAt: timestamptz("created_at")
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamptz("updated_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("lesson_templates_lesson_id_idx").using(
      "btree",
      table.lessonId.asc().nullsLast().op("int4_ops"),
      table.sort.asc().nullsLast().op("int4_ops")
    ),
    foreignKey({
      columns: [table.lessonId],
      foreignColumns: [lessons.id],
      name: "lesson_templates_lesson_id_fkey",
    }).onDelete("cascade"),
    check("lesson_templates_kind_check", sql`kind = ANY (ARRAY['starter'::text, 'example'::text])`),
  ]
);

export const mockInterviewResponses = pgTable(
  "mock_interview_responses",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    scenarioId: uuid("scenario_id").notNull(),
    responseText: text("response_text").notNull(),
    status: text().default("graded_pending").notNull(),
    overallScore: numeric("overall_score", { mode: "number" }),
    pass: boolean(),
    feedbackSummary: text("feedback_summary"),
    gradedAt: timestamptz("graded_at"),
    createdAt: timestamptz("created_at")
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamptz("updated_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("mock_responses_user_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("timestamptz_ops"),
      table.createdAt.desc().nullsFirst().op("timestamptz_ops")
    ),
    foreignKey({
      columns: [table.scenarioId],
      foreignColumns: [mockInterviewScenarios.id],
      name: "mock_interview_responses_scenario_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersInAuth.id],
      name: "mock_interview_responses_user_id_fkey",
    }).onDelete("cascade"),
    unique("mock_interview_responses_user_id_scenario_id_key").on(table.scenarioId, table.userId),
    check(
      "mock_interview_responses_status_check",
      sql`status = ANY (ARRAY['graded_pending'::text, 'grading'::text, 'graded'::text, 'grading_failed'::text])`
    ),
  ]
);

export const mockInterviewScenarios = pgTable(
  "mock_interview_scenarios",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    slug: text().notNull(),
    prompt: text().notNull(),
    competency: text().notNull(),
    category: text().notNull(),
    difficulty: text().default("medium").notNull(),
    sort: integer().default(0).notNull(),
    isPublished: boolean("is_published").default(true).notNull(),
    createdAt: timestamptz("created_at")
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamptz("updated_at")
      .default(sql`now()`)
      .notNull(),
    isAiGenerated: boolean("is_ai_generated").default(false).notNull(),
    generatedAt: timestamptz("generated_at"),
    rubricSummary: text("rubric_summary"),
  },
  (table) => [
    index("mock_scenarios_published_idx")
      .using(
        "btree",
        table.isPublished.asc().nullsLast().op("int4_ops"),
        table.sort.asc().nullsLast().op("int4_ops")
      )
      .where(sql`(is_published = true)`),
    unique("mock_interview_scenarios_slug_key").on(table.slug),
    check(
      "mock_interview_scenarios_category_check",
      sql`category = ANY (ARRAY['behavioural'::text, 'procedural'::text, 'judgment'::text])`
    ),
    check(
      "mock_interview_scenarios_difficulty_check",
      sql`difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])`
    ),
  ]
);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid().primaryKey().notNull(),
    email: text().notNull(),
    fullName: text("full_name"),
    role: userRole().default("learner").notNull(),
    hasAccess: boolean("has_access").default(true).notNull(),
    industryTrack: industryTrack("industry_track").default("it_saas"),
    createdAt: timestamptz("created_at")
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamptz("updated_at")
      .default(sql`now()`)
      .notNull(),
    weeklyDigestOptIn: boolean("weekly_digest_opt_in").default(true).notNull(),
    signupSource: text("signup_source"),
  },
  (table) => [
    index("profiles_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
    index("profiles_signup_source_idx")
      .using("btree", table.signupSource.asc().nullsLast().op("text_ops"))
      .where(sql`(signup_source IS NOT NULL)`),
    foreignKey({
      columns: [table.id],
      foreignColumns: [usersInAuth.id],
      name: "profiles_id_fkey",
    }).onDelete("cascade"),
  ]
);

export const prompts = pgTable(
  "prompts",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    version: integer().notNull(),
    body: text().notNull(),
    isCurrent: boolean("is_current").default(false).notNull(),
    createdAt: timestamptz("created_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("prompts_current_unique")
      .using("btree", table.name.asc().nullsLast().op("text_ops"))
      .where(sql`(is_current = true)`),
    unique("prompts_name_version_key").on(table.name, table.version),
  ]
);

export const purchases = pgTable(
  "purchases",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    stripeSessionId: text("stripe_session_id").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    amountCents: integer("amount_cents").notNull(),
    currency: text().notNull(),
    status: text().notNull(),
    createdAt: timestamptz("created_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("purchases_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersInAuth.id],
      name: "purchases_user_id_fkey",
    }).onDelete("cascade"),
    unique("purchases_stripe_session_id_key").on(table.stripeSessionId),
    check(
      "purchases_status_check",
      sql`status = ANY (ARRAY['paid'::text, 'refunded'::text, 'failed'::text])`
    ),
  ]
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    lessonId: uuid("lesson_id").notNull(),
    score: integer().notNull(),
    total: integer().notNull(),
    passed: boolean().notNull(),
    rawAnswers: jsonb("raw_answers").notNull(),
    submittedAt: timestamptz("submitted_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("quiz_attempts_user_lesson_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
      table.lessonId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.lessonId],
      foreignColumns: [lessons.id],
      name: "quiz_attempts_lesson_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersInAuth.id],
      name: "quiz_attempts_user_id_fkey",
    }).onDelete("cascade"),
  ]
);

export const quizItems = pgTable(
  "quiz_items",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    lessonId: uuid("lesson_id").notNull(),
    sort: integer().notNull(),
    stem: text().notNull(),
    options: jsonb().notNull(),
    correct: text().notNull(),
    distractorRationale: jsonb("distractor_rationale").notNull(),
    competency: text().notNull(),
    difficulty: text().notNull(),
    createdAt: timestamptz("created_at")
      .default(sql`now()`)
      .notNull(),
    isAiGenerated: boolean("is_ai_generated").default(false).notNull(),
    generatedAt: timestamptz("generated_at"),
  },
  (table) => [
    index("quiz_items_lesson_sort_idx").using(
      "btree",
      table.lessonId.asc().nullsLast().op("int4_ops"),
      table.sort.asc().nullsLast().op("int4_ops")
    ),
    foreignKey({
      columns: [table.lessonId],
      foreignColumns: [lessons.id],
      name: "quiz_items_lesson_id_fkey",
    }).onDelete("cascade"),
    check(
      "quiz_items_difficulty_check",
      sql`difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])`
    ),
  ]
);

export const quizItemSeen = pgTable(
  "quiz_item_seen",
  {
    userId: uuid("user_id").notNull(),
    quizItemId: uuid("quiz_item_id").notNull(),
    lessonId: uuid("lesson_id").notNull(),
    seenAt: timestamptz("seen_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("quiz_item_seen_user_lesson_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
      table.lessonId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.lessonId],
      foreignColumns: [lessons.id],
      name: "quiz_item_seen_lesson_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.quizItemId],
      foreignColumns: [quizItems.id],
      name: "quiz_item_seen_quiz_item_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersInAuth.id],
      name: "quiz_item_seen_user_id_fkey",
    }).onDelete("cascade"),
    primaryKey({ columns: [table.quizItemId, table.userId], name: "quiz_item_seen_pkey" }),
  ]
);

export const rubrics = pgTable(
  "rubrics",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    competency: text().notNull(),
    version: integer().notNull(),
    schemaJson: jsonb("schema_json").notNull(),
    isCurrent: boolean("is_current").default(false).notNull(),
    createdAt: timestamptz("created_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("rubrics_current_unique")
      .using("btree", table.competency.asc().nullsLast().op("text_ops"))
      .where(sql`(is_current = true)`),
    unique("rubrics_competency_version_key").on(table.competency, table.version),
  ]
);

export const rubricScores = pgTable(
  "rubric_scores",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    submissionId: uuid("submission_id").notNull(),
    rubricId: uuid("rubric_id").notNull(),
    dimension: text().notNull(),
    score: integer().notNull(),
    justification: text().notNull(),
    quote: text(),
    suggestion: text(),
    model: text().notNull(),
    promptVersion: integer("prompt_version").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: timestamptz("created_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("rubric_scores_submission_idx").using(
      "btree",
      table.submissionId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.rubricId],
      foreignColumns: [rubrics.id],
      name: "rubric_scores_rubric_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.submissionId],
      foreignColumns: [submissions.id],
      name: "rubric_scores_submission_id_fkey",
    }).onDelete("cascade"),
    unique("rubric_scores_submission_id_dimension_key").on(table.dimension, table.submissionId),
    check("rubric_scores_score_check", sql`(score >= 1) AND (score <= 5)`),
  ]
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    lessonId: uuid("lesson_id").notNull(),
    storagePath: text("storage_path").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    extractedText: text("extracted_text"),
    status: submissionStatus().default("pending").notNull(),
    overallScore: numeric("overall_score", { precision: 3, scale: 2, mode: "number" }),
    pass: boolean(),
    hireReady: boolean("hire_ready"),
    submittedAt: timestamptz("submitted_at")
      .default(sql`now()`)
      .notNull(),
    gradedAt: timestamptz("graded_at"),
  },
  (table) => [
    index("submissions_lesson_idx").using("btree", table.lessonId.asc().nullsLast().op("uuid_ops")),
    index("submissions_status_idx")
      .using("btree", table.status.asc().nullsLast().op("enum_ops"))
      .where(
        sql`(status = ANY (ARRAY['pending'::submission_status, 'grading'::submission_status]))`
      ),
    index("submissions_user_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("timestamptz_ops"),
      table.submittedAt.desc().nullsFirst().op("timestamptz_ops")
    ),
    foreignKey({
      columns: [table.lessonId],
      foreignColumns: [lessons.id],
      name: "submissions_lesson_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersInAuth.id],
      name: "submissions_user_id_fkey",
    }).onDelete("cascade"),
  ]
);

export const tutorMessages = pgTable(
  "tutor_messages",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    lessonSlug: text("lesson_slug"),
    role: text().notNull(),
    content: text().notNull(),
    inputTokens: integer("input_tokens").default(0).notNull(),
    outputTokens: integer("output_tokens").default(0).notNull(),
    model: text(),
    createdAt: timestamptz("created_at")
      .default(sql`now()`)
      .notNull(),
    conversationId: uuid("conversation_id"),
  },
  (table) => [
    index("tutor_messages_conversation_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
      table.conversationId.asc().nullsLast().op("timestamptz_ops"),
      table.createdAt.asc().nullsLast().op("uuid_ops")
    ),
    index("tutor_messages_role_created_idx").using(
      "btree",
      table.role.asc().nullsLast().op("text_ops"),
      table.createdAt.desc().nullsFirst().op("text_ops")
    ),
    index("tutor_messages_user_created_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("timestamptz_ops"),
      table.createdAt.desc().nullsFirst().op("timestamptz_ops")
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersInAuth.id],
      name: "tutor_messages_user_id_fkey",
    }).onDelete("cascade"),
    check("tutor_messages_role_check", sql`role = ANY (ARRAY['user'::text, 'assistant'::text])`),
  ]
);

export const usersInAuth = auth.table(
  "users",
  {
    instanceId: uuid("instance_id"),
    id: uuid().primaryKey().notNull(),
    aud: varchar({ length: 255 }),
    role: varchar({ length: 255 }),
    email: varchar({ length: 255 }),
    encryptedPassword: varchar("encrypted_password", { length: 255 }),
    emailConfirmedAt: timestamptz("email_confirmed_at"),
    invitedAt: timestamptz("invited_at"),
    confirmationToken: varchar("confirmation_token", { length: 255 }),
    confirmationSentAt: timestamptz("confirmation_sent_at"),
    recoveryToken: varchar("recovery_token", { length: 255 }),
    recoverySentAt: timestamptz("recovery_sent_at"),
    emailChangeTokenNew: varchar("email_change_token_new", { length: 255 }),
    emailChange: varchar("email_change", { length: 255 }),
    emailChangeSentAt: timestamptz("email_change_sent_at"),
    lastSignInAt: timestamptz("last_sign_in_at"),
    rawAppMetaData: jsonb("raw_app_meta_data"),
    rawUserMetaData: jsonb("raw_user_meta_data"),
    isSuperAdmin: boolean("is_super_admin"),
    createdAt: timestamptz("created_at"),
    updatedAt: timestamptz("updated_at"),
    phone: text().default(sql`NULL`),
    phoneConfirmedAt: timestamptz("phone_confirmed_at"),
    phoneChange: text("phone_change").default(""),
    phoneChangeToken: varchar("phone_change_token", { length: 255 }).default(""),
    phoneChangeSentAt: timestamptz("phone_change_sent_at"),
    confirmedAt: timestamptz("confirmed_at").generatedAlwaysAs(
      sql`LEAST(email_confirmed_at, phone_confirmed_at)`
    ),
    emailChangeTokenCurrent: varchar("email_change_token_current", { length: 255 }).default(""),
    emailChangeConfirmStatus: smallint("email_change_confirm_status").default(0),
    bannedUntil: timestamptz("banned_until"),
    reauthenticationToken: varchar("reauthentication_token", { length: 255 }).default(""),
    reauthenticationSentAt: timestamptz("reauthentication_sent_at"),
    isSsoUser: boolean("is_sso_user").default(false).notNull(),
    deletedAt: timestamptz("deleted_at"),
    isAnonymous: boolean("is_anonymous").default(false).notNull(),
  },
  (table) => [
    uniqueIndex("confirmation_token_idx")
      .using("btree", table.confirmationToken.asc().nullsLast().op("text_ops"))
      .where(sql`((confirmation_token)::text !~ '^[0-9 ]*$'::text)`),
    uniqueIndex("email_change_token_current_idx")
      .using("btree", table.emailChangeTokenCurrent.asc().nullsLast().op("text_ops"))
      .where(sql`((email_change_token_current)::text !~ '^[0-9 ]*$'::text)`),
    uniqueIndex("email_change_token_new_idx")
      .using("btree", table.emailChangeTokenNew.asc().nullsLast().op("text_ops"))
      .where(sql`((email_change_token_new)::text !~ '^[0-9 ]*$'::text)`),
    index("idx_users_created_at_desc").using(
      "btree",
      table.createdAt.desc().nullsFirst().op("timestamptz_ops")
    ),
    index("idx_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
    index("idx_users_last_sign_in_at_desc").using(
      "btree",
      table.lastSignInAt.desc().nullsFirst().op("timestamptz_ops")
    ),
    index("idx_users_name")
      .using("btree", sql`((raw_user_meta_data ->> 'name'::text))`)
      .where(sql`((raw_user_meta_data ->> 'name'::text) IS NOT NULL)`),
    uniqueIndex("reauthentication_token_idx")
      .using("btree", table.reauthenticationToken.asc().nullsLast().op("text_ops"))
      .where(sql`((reauthentication_token)::text !~ '^[0-9 ]*$'::text)`),
    uniqueIndex("recovery_token_idx")
      .using("btree", table.recoveryToken.asc().nullsLast().op("text_ops"))
      .where(sql`((recovery_token)::text !~ '^[0-9 ]*$'::text)`),
    uniqueIndex("users_email_partial_key")
      .using("btree", table.email.asc().nullsLast().op("text_ops"))
      .where(sql`(is_sso_user = false)`),
    index("users_instance_id_email_idx").using(
      "btree",
      sql`instance_id`,
      sql`lower((email)::text)`
    ),
    index("users_instance_id_idx").using(
      "btree",
      table.instanceId.asc().nullsLast().op("uuid_ops")
    ),
    index("users_is_anonymous_idx").using(
      "btree",
      table.isAnonymous.asc().nullsLast().op("bool_ops")
    ),
    unique("users_phone_key").on(table.phone),
    check(
      "users_email_change_confirm_status_check",
      sql`(email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)`
    ),
  ]
);

export const workbookAssignments = pgTable(
  "workbook_assignments",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    lessonId: uuid("lesson_id").notNull(),
    title: text().notNull(),
    brief: text().notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    isAiGenerated: boolean("is_ai_generated").default(false).notNull(),
    generatedAt: timestamptz("generated_at"),
    sort: integer().default(100).notNull(),
    createdAt: timestamptz("created_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("workbook_assignments_lesson_idx").using(
      "btree",
      table.lessonId.asc().nullsLast().op("int4_ops"),
      table.sort.asc().nullsLast().op("int4_ops")
    ),
    foreignKey({
      columns: [table.lessonId],
      foreignColumns: [lessons.id],
      name: "workbook_assignments_lesson_id_fkey",
    }).onDelete("cascade"),
  ]
);

export const workbookAssignmentSeen = pgTable(
  "workbook_assignment_seen",
  {
    userId: uuid("user_id").notNull(),
    assignmentId: uuid("assignment_id").notNull(),
    lessonId: uuid("lesson_id").notNull(),
    seenAt: timestamptz("seen_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("workbook_assignment_seen_user_lesson_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("timestamptz_ops"),
      table.lessonId.asc().nullsLast().op("timestamptz_ops"),
      table.seenAt.desc().nullsFirst().op("timestamptz_ops")
    ),
    foreignKey({
      columns: [table.assignmentId],
      foreignColumns: [workbookAssignments.id],
      name: "workbook_assignment_seen_assignment_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.lessonId],
      foreignColumns: [lessons.id],
      name: "workbook_assignment_seen_lesson_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersInAuth.id],
      name: "workbook_assignment_seen_user_id_fkey",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.assignmentId, table.userId],
      name: "workbook_assignment_seen_pkey",
    }),
  ]
);
