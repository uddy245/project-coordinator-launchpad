--
-- PostgreSQL database dump
--


-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: audit_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.audit_reason AS ENUM (
    'sampled',
    'requested'
);


--
-- Name: audit_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.audit_status AS ENUM (
    'pending',
    'approved',
    'overridden'
);


--
-- Name: industry_track; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.industry_track AS ENUM (
    'it_saas',
    'healthcare',
    'construction',
    'marketing'
);


--
-- Name: submission_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.submission_status AS ENUM (
    'pending',
    'grading',
    'graded',
    'grading_failed',
    'manual_review'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'learner',
    'admin'
);


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: bump_learning_activity(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bump_learning_activity(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.learning_activity (user_id, activity_date, events_count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, activity_date) do update
    set events_count = learning_activity.events_count + 1,
        updated_at = now();
end;
$$;


--
-- Name: ensure_gate_status_row(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_gate_status_row() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  if (tg_op = 'INSERT' and new.has_access)
     or (tg_op = 'UPDATE' and new.has_access and not coalesce(old.has_access, false)) then
    insert into public.gate_status (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null)
  );
  return new;
end;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$;


--
-- Name: lesson_progress_activity_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lesson_progress_activity_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if (TG_OP = 'INSERT') then
    perform public.bump_learning_activity(new.user_id);
  elsif (TG_OP = 'UPDATE') then
    if (
      (new.video_watched is distinct from old.video_watched and new.video_watched = true) or
      (new.quiz_passed is distinct from old.quiz_passed and new.quiz_passed = true) or
      (new.artifact_submitted is distinct from old.artifact_submitted and new.artifact_submitted = true)
    ) then
      perform public.bump_learning_activity(new.user_id);
    end if;
  end if;
  return new;
end;
$$;


--
-- Name: refresh_portfolio_gate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_portfolio_gate() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_user uuid := coalesce(new.user_id, old.user_id);
  v_passed int;
begin
  select count(distinct s.lesson_id)
    into v_passed
  from public.submissions s
  where s.user_id = v_user and s.pass is true;

  insert into public.gate_status (user_id, portfolio_artifacts_count)
  values (v_user, least(v_passed, 7))
  on conflict (user_id) do update
    set portfolio_artifacts_count = least(v_passed, public.gate_status.portfolio_artifacts_target);

  update public.gate_status
    set portfolio_complete = (portfolio_artifacts_count >= portfolio_artifacts_target)
    where user_id = v_user;

  return null;
end;
$$;


--
-- Name: FUNCTION refresh_portfolio_gate(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.refresh_portfolio_gate() IS 'Recomputes gate_status.portfolio_artifacts_count (distinct passed-submission lessons, capped at target) + portfolio_complete. Implements the GRADE-003 refresh that LES-010 documented but never shipped.';


--
-- Name: search_lessons(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_lessons(q text) RETURNS TABLE(id uuid, slug text, number integer, title text, summary text, competency text, snippet text, rank real)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  with query as (
    select websearch_to_tsquery('english', q) as ts
  )
  select
    l.id,
    l.slug,
    l.number,
    l.title,
    l.summary,
    l.competency,
    coalesce(
      nullif(
        ts_headline(
          'english',
          coalesce(l.summary, l.title),
          (select ts from query),
          'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=22,MinWords=8,ShortWord=3,FragmentDelimiter= … '
        ),
        ''
      ),
      l.summary
    ) as snippet,
    ts_rank(l.search_text, (select ts from query))::float4 as rank
  from public.lessons l, query
  where l.is_published = true
    and l.search_text @@ query.ts
  order by rank desc, l.number asc
  limit 50;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: user_streak(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_streak(p_user_id uuid) RETURNS integer
    LANGUAGE sql STABLE
    AS $$
  with active as (
    select activity_date
    from public.learning_activity
    where user_id = p_user_id
    order by activity_date desc
  ),
  with_gap as (
    select
      activity_date,
      -- gap = days back from today
      (current_date - activity_date) as days_ago,
      row_number() over (order by activity_date desc) - 1 as idx
    from active
  )
  select coalesce(count(*)::integer, 0)
  from with_gap
  where days_ago = idx
    or (days_ago = idx + 1 and idx = 0);
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: audit_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    reason public.audit_reason NOT NULL,
    status public.audit_status DEFAULT 'pending'::public.audit_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE audit_queue; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.audit_queue IS 'Pending human reviews. 10% sampled + learner-requested.';


--
-- Name: audit_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    audit_queue_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    decision public.audit_status NOT NULL,
    overrides jsonb,
    note text,
    decided_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE audit_records; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.audit_records IS 'Append-only decision log for audit reviews.';


--
-- Name: capstone_artifacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capstone_artifacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attempt_id uuid NOT NULL,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    file_path text NOT NULL,
    file_name text NOT NULL,
    file_size bigint,
    content_type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: capstone_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capstone_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    scenario_id uuid NOT NULL,
    status text DEFAULT 'in_progress'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone,
    graded_at timestamp with time zone,
    overall_score numeric,
    pass boolean,
    feedback_summary text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT capstone_attempts_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'submitted'::text, 'graded'::text, 'withdrawn'::text])))
);


--
-- Name: capstone_scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capstone_scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    brief text NOT NULL,
    required_artifacts text[] DEFAULT '{}'::text[] NOT NULL,
    estimated_hours integer,
    is_published boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sort integer DEFAULT 100 NOT NULL,
    rubric_summary text
);


--
-- Name: gate_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gate_status (
    user_id uuid NOT NULL,
    foundation_complete boolean DEFAULT false NOT NULL,
    portfolio_complete boolean DEFAULT false NOT NULL,
    portfolio_artifacts_count integer DEFAULT 0 NOT NULL,
    portfolio_artifacts_target integer DEFAULT 7 NOT NULL,
    interview_complete boolean DEFAULT false NOT NULL,
    industry_complete boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE gate_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.gate_status IS 'Four-gate progress tracker. Gate 2 (portfolio) is the only one with real MVP semantics. Rows auto-created when profiles.has_access flips true.';


--
-- Name: learning_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_activity (
    user_id uuid NOT NULL,
    activity_date date NOT NULL,
    events_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lesson_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_progress (
    user_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    video_seconds_watched integer DEFAULT 0 NOT NULL,
    video_duration integer,
    video_watched boolean DEFAULT false NOT NULL,
    quiz_passed boolean DEFAULT false NOT NULL,
    artifact_submitted boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE lesson_progress; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lesson_progress IS 'Per-learner per-lesson progress. video_watched flips at >=90% watched; quiz_passed flips from submitQuizAttempt; artifact_submitted flips in M4.';


--
-- Name: lesson_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    file_url text NOT NULL,
    kind text NOT NULL,
    sort integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lesson_templates_kind_check CHECK ((kind = ANY (ARRAY['starter'::text, 'example'::text])))
);


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    number integer NOT NULL,
    title text NOT NULL,
    summary text,
    video_url text,
    scenario_text text,
    estimated_minutes integer,
    is_published boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    competency text NOT NULL,
    prompt_name text NOT NULL,
    is_preview boolean DEFAULT false NOT NULL,
    search_text tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, ((((COALESCE(title, ''::text) || ' '::text) || COALESCE(summary, ''::text)) || ' '::text) || COALESCE(competency, ''::text)))) STORED
);


--
-- Name: TABLE lessons; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lessons IS 'Course lessons; only published lessons are visible to learners';


--
-- Name: COLUMN lessons.video_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lessons.video_url IS 'Absolute embed URL (e.g. Bunny Stream iframe). Null while content is in production.';


--
-- Name: COLUMN lessons.competency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lessons.competency IS 'The rubric.competency this lesson is graded against. Determines which rubric row (where is_current=true) the grader loads.';


--
-- Name: COLUMN lessons.prompt_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lessons.prompt_name IS 'The prompts.name this lesson uses for grading. Determines which prompt row (where is_current=true) the grader loads.';


--
-- Name: COLUMN lessons.is_preview; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lessons.is_preview IS 'When true, lesson is publicly readable as a sample (auth-bypass). The /preview/[slug] route serves these.';


--
-- Name: COLUMN lessons.search_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lessons.search_text IS 'Generated tsvector for full-text search across title, summary, competency. Indexed via GIN.';


--
-- Name: mock_interview_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mock_interview_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    scenario_id uuid NOT NULL,
    response_text text NOT NULL,
    status text DEFAULT 'graded_pending'::text NOT NULL,
    overall_score numeric,
    pass boolean,
    feedback_summary text,
    graded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mock_interview_responses_status_check CHECK ((status = ANY (ARRAY['graded_pending'::text, 'grading'::text, 'graded'::text, 'grading_failed'::text])))
);


--
-- Name: mock_interview_scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mock_interview_scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    prompt text NOT NULL,
    competency text NOT NULL,
    category text NOT NULL,
    difficulty text DEFAULT 'medium'::text NOT NULL,
    sort integer DEFAULT 0 NOT NULL,
    is_published boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_ai_generated boolean DEFAULT false NOT NULL,
    generated_at timestamp with time zone,
    rubric_summary text,
    CONSTRAINT mock_interview_scenarios_category_check CHECK ((category = ANY (ARRAY['behavioural'::text, 'procedural'::text, 'judgment'::text]))),
    CONSTRAINT mock_interview_scenarios_difficulty_check CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    role public.user_role DEFAULT 'learner'::public.user_role NOT NULL,
    has_access boolean DEFAULT true NOT NULL,
    industry_track public.industry_track DEFAULT 'it_saas'::public.industry_track,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    weekly_digest_opt_in boolean DEFAULT true NOT NULL,
    signup_source text
);


--
-- Name: TABLE profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.profiles IS 'User profiles, one per auth.users row, auto-created on signup';


--
-- Name: COLUMN profiles.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.role IS 'learner (default) or admin';


--
-- Name: COLUMN profiles.has_access; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.has_access IS 'True after successful Stripe purchase; gates access to paid content';


--
-- Name: COLUMN profiles.weekly_digest_opt_in; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.weekly_digest_opt_in IS 'Per-user opt-in for the Sunday weekly digest email. Default true.';


--
-- Name: COLUMN profiles.signup_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.signup_source IS 'Optional attribution token from the signup URL ?ref= param. Lowercased, max 80 chars. Sanitised at the application layer to [a-z0-9_-]+.';


--
-- Name: prompts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    version integer NOT NULL,
    body text NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE prompts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.prompts IS 'Versioned AI grading prompt templates; flip is_current to deploy';


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    stripe_session_id text NOT NULL,
    stripe_payment_intent_id text,
    amount_cents integer NOT NULL,
    currency text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT purchases_status_check CHECK ((status = ANY (ARRAY['paid'::text, 'refunded'::text, 'failed'::text])))
);


--
-- Name: TABLE purchases; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.purchases IS 'Stripe payment records. Written only by the webhook using service_role. Unique stripe_session_id guarantees webhook idempotency.';


--
-- Name: quiz_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    score integer NOT NULL,
    total integer NOT NULL,
    passed boolean NOT NULL,
    raw_answers jsonb NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE quiz_attempts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.quiz_attempts IS 'One row per submit. Score and passed verdict are computed server-side in the submitQuizAttempt action.';


--
-- Name: quiz_item_seen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_item_seen (
    user_id uuid NOT NULL,
    quiz_item_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    seen_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quiz_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    sort integer NOT NULL,
    stem text NOT NULL,
    options jsonb NOT NULL,
    correct text NOT NULL,
    distractor_rationale jsonb NOT NULL,
    competency text NOT NULL,
    difficulty text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_ai_generated boolean DEFAULT false NOT NULL,
    generated_at timestamp with time zone,
    CONSTRAINT quiz_items_difficulty_check CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])))
);


--
-- Name: TABLE quiz_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.quiz_items IS 'Quiz questions. RLS blocks authenticated SELECT; use the view or service_role.';


--
-- Name: quiz_items_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.quiz_items_public WITH (security_invoker='false') AS
 SELECT id,
    lesson_id,
    sort,
    stem,
    options,
    competency,
    difficulty
   FROM public.quiz_items qi
  WHERE (EXISTS ( SELECT 1
           FROM public.profiles p
          WHERE ((p.id = auth.uid()) AND (p.has_access = true))));


--
-- Name: VIEW quiz_items_public; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.quiz_items_public IS 'Learner-facing projection of quiz_items — omits correct and distractor_rationale. SECURITY DEFINER; filters on caller has_access.';


--
-- Name: rubric_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rubric_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    rubric_id uuid NOT NULL,
    dimension text NOT NULL,
    score integer NOT NULL,
    justification text NOT NULL,
    quote text,
    suggestion text,
    model text NOT NULL,
    prompt_version integer NOT NULL,
    input_tokens integer,
    output_tokens integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rubric_scores_score_check CHECK (((score >= 1) AND (score <= 5)))
);


--
-- Name: TABLE rubric_scores; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rubric_scores IS 'Per-dimension AI scores. Append-only after grading — overrides live in audit_records.';


--
-- Name: rubrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rubrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competency text NOT NULL,
    version integer NOT NULL,
    schema_json jsonb NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE rubrics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rubrics IS 'Versioned AI grading rubrics; flip is_current to deploy a new version';


--
-- Name: submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    storage_path text NOT NULL,
    original_filename text NOT NULL,
    mime_type text NOT NULL,
    size_bytes integer NOT NULL,
    extracted_text text,
    status public.submission_status DEFAULT 'pending'::public.submission_status NOT NULL,
    overall_score numeric(3,2),
    pass boolean,
    hire_ready boolean,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    graded_at timestamp with time zone
);


--
-- Name: TABLE submissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.submissions IS 'Artifact uploads, one per learner per attempt. Status drives UI state.';


--
-- Name: tutor_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tutor_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    lesson_slug text,
    role text NOT NULL,
    content text NOT NULL,
    input_tokens integer DEFAULT 0 NOT NULL,
    output_tokens integer DEFAULT 0 NOT NULL,
    model text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    conversation_id uuid,
    CONSTRAINT tutor_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);


--
-- Name: workbook_assignment_seen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workbook_assignment_seen (
    user_id uuid NOT NULL,
    assignment_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    seen_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workbook_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workbook_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    title text NOT NULL,
    brief text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_ai_generated boolean DEFAULT false NOT NULL,
    generated_at timestamp with time zone,
    sort integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: audit_queue audit_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_queue
    ADD CONSTRAINT audit_queue_pkey PRIMARY KEY (id);


--
-- Name: audit_queue audit_queue_submission_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_queue
    ADD CONSTRAINT audit_queue_submission_id_key UNIQUE (submission_id);


--
-- Name: audit_records audit_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_records
    ADD CONSTRAINT audit_records_pkey PRIMARY KEY (id);


--
-- Name: capstone_artifacts capstone_artifacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capstone_artifacts
    ADD CONSTRAINT capstone_artifacts_pkey PRIMARY KEY (id);


--
-- Name: capstone_attempts capstone_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capstone_attempts
    ADD CONSTRAINT capstone_attempts_pkey PRIMARY KEY (id);


--
-- Name: capstone_scenarios capstone_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capstone_scenarios
    ADD CONSTRAINT capstone_scenarios_pkey PRIMARY KEY (id);


--
-- Name: capstone_scenarios capstone_scenarios_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capstone_scenarios
    ADD CONSTRAINT capstone_scenarios_slug_key UNIQUE (slug);


--
-- Name: gate_status gate_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gate_status
    ADD CONSTRAINT gate_status_pkey PRIMARY KEY (user_id);


--
-- Name: learning_activity learning_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_activity
    ADD CONSTRAINT learning_activity_pkey PRIMARY KEY (user_id, activity_date);


--
-- Name: lesson_progress lesson_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_pkey PRIMARY KEY (user_id, lesson_id);


--
-- Name: lesson_templates lesson_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_templates
    ADD CONSTRAINT lesson_templates_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_slug_key UNIQUE (slug);


--
-- Name: mock_interview_responses mock_interview_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_interview_responses
    ADD CONSTRAINT mock_interview_responses_pkey PRIMARY KEY (id);


--
-- Name: mock_interview_responses mock_interview_responses_user_id_scenario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_interview_responses
    ADD CONSTRAINT mock_interview_responses_user_id_scenario_id_key UNIQUE (user_id, scenario_id);


--
-- Name: mock_interview_scenarios mock_interview_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_interview_scenarios
    ADD CONSTRAINT mock_interview_scenarios_pkey PRIMARY KEY (id);


--
-- Name: mock_interview_scenarios mock_interview_scenarios_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_interview_scenarios
    ADD CONSTRAINT mock_interview_scenarios_slug_key UNIQUE (slug);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: prompts prompts_name_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompts
    ADD CONSTRAINT prompts_name_version_key UNIQUE (name, version);


--
-- Name: prompts prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompts
    ADD CONSTRAINT prompts_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_stripe_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_stripe_session_id_key UNIQUE (stripe_session_id);


--
-- Name: quiz_attempts quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id);


--
-- Name: quiz_item_seen quiz_item_seen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_item_seen
    ADD CONSTRAINT quiz_item_seen_pkey PRIMARY KEY (user_id, quiz_item_id);


--
-- Name: quiz_items quiz_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_items
    ADD CONSTRAINT quiz_items_pkey PRIMARY KEY (id);


--
-- Name: rubric_scores rubric_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_scores
    ADD CONSTRAINT rubric_scores_pkey PRIMARY KEY (id);


--
-- Name: rubric_scores rubric_scores_submission_id_dimension_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_scores
    ADD CONSTRAINT rubric_scores_submission_id_dimension_key UNIQUE (submission_id, dimension);


--
-- Name: rubrics rubrics_competency_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubrics
    ADD CONSTRAINT rubrics_competency_version_key UNIQUE (competency, version);


--
-- Name: rubrics rubrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubrics
    ADD CONSTRAINT rubrics_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: tutor_messages tutor_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_messages
    ADD CONSTRAINT tutor_messages_pkey PRIMARY KEY (id);


--
-- Name: workbook_assignment_seen workbook_assignment_seen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workbook_assignment_seen
    ADD CONSTRAINT workbook_assignment_seen_pkey PRIMARY KEY (user_id, assignment_id);


--
-- Name: workbook_assignments workbook_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workbook_assignments
    ADD CONSTRAINT workbook_assignments_pkey PRIMARY KEY (id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: idx_users_created_at_desc; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_created_at_desc ON auth.users USING btree (created_at DESC);


--
-- Name: idx_users_email; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_email ON auth.users USING btree (email);


--
-- Name: idx_users_last_sign_in_at_desc; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_last_sign_in_at_desc ON auth.users USING btree (last_sign_in_at DESC);


--
-- Name: idx_users_name; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_name ON auth.users USING btree (((raw_user_meta_data ->> 'name'::text))) WHERE ((raw_user_meta_data ->> 'name'::text) IS NOT NULL);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: audit_queue_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_queue_status_idx ON public.audit_queue USING btree (status) WHERE (status = 'pending'::public.audit_status);


--
-- Name: audit_records_queue_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_records_queue_idx ON public.audit_records USING btree (audit_queue_id, decided_at DESC);


--
-- Name: capstone_artifacts_attempt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX capstone_artifacts_attempt_idx ON public.capstone_artifacts USING btree (attempt_id, kind);


--
-- Name: capstone_attempts_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX capstone_attempts_user_idx ON public.capstone_attempts USING btree (user_id, started_at DESC);


--
-- Name: capstone_scenarios_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX capstone_scenarios_sort_idx ON public.capstone_scenarios USING btree (sort);


--
-- Name: learning_activity_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX learning_activity_user_idx ON public.learning_activity USING btree (user_id, activity_date DESC);


--
-- Name: lesson_progress_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lesson_progress_user_idx ON public.lesson_progress USING btree (user_id);


--
-- Name: lesson_templates_lesson_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lesson_templates_lesson_id_idx ON public.lesson_templates USING btree (lesson_id, sort);


--
-- Name: lessons_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lessons_number_idx ON public.lessons USING btree (number);


--
-- Name: lessons_preview_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lessons_preview_idx ON public.lessons USING btree (is_preview) WHERE (is_preview = true);


--
-- Name: lessons_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lessons_published_idx ON public.lessons USING btree (is_published) WHERE (is_published = true);


--
-- Name: lessons_search_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lessons_search_idx ON public.lessons USING gin (search_text);


--
-- Name: mock_responses_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mock_responses_user_idx ON public.mock_interview_responses USING btree (user_id, created_at DESC);


--
-- Name: mock_scenarios_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mock_scenarios_published_idx ON public.mock_interview_scenarios USING btree (is_published, sort) WHERE (is_published = true);


--
-- Name: profiles_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_email_idx ON public.profiles USING btree (email);


--
-- Name: profiles_signup_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_signup_source_idx ON public.profiles USING btree (signup_source) WHERE (signup_source IS NOT NULL);


--
-- Name: prompts_current_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX prompts_current_unique ON public.prompts USING btree (name) WHERE (is_current = true);


--
-- Name: purchases_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchases_user_id_idx ON public.purchases USING btree (user_id);


--
-- Name: quiz_attempts_user_lesson_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quiz_attempts_user_lesson_idx ON public.quiz_attempts USING btree (user_id, lesson_id);


--
-- Name: quiz_item_seen_user_lesson_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quiz_item_seen_user_lesson_idx ON public.quiz_item_seen USING btree (user_id, lesson_id);


--
-- Name: quiz_items_lesson_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quiz_items_lesson_sort_idx ON public.quiz_items USING btree (lesson_id, sort);


--
-- Name: rubric_scores_submission_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rubric_scores_submission_idx ON public.rubric_scores USING btree (submission_id);


--
-- Name: rubrics_current_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX rubrics_current_unique ON public.rubrics USING btree (competency) WHERE (is_current = true);


--
-- Name: submissions_lesson_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX submissions_lesson_idx ON public.submissions USING btree (lesson_id);


--
-- Name: submissions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX submissions_status_idx ON public.submissions USING btree (status) WHERE (status = ANY (ARRAY['pending'::public.submission_status, 'grading'::public.submission_status]));


--
-- Name: submissions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX submissions_user_idx ON public.submissions USING btree (user_id, submitted_at DESC);


--
-- Name: tutor_messages_conversation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tutor_messages_conversation_idx ON public.tutor_messages USING btree (user_id, conversation_id, created_at);


--
-- Name: tutor_messages_role_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tutor_messages_role_created_idx ON public.tutor_messages USING btree (role, created_at DESC);


--
-- Name: tutor_messages_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tutor_messages_user_created_idx ON public.tutor_messages USING btree (user_id, created_at DESC);


--
-- Name: workbook_assignment_seen_user_lesson_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workbook_assignment_seen_user_lesson_idx ON public.workbook_assignment_seen USING btree (user_id, lesson_id, seen_at DESC);


--
-- Name: workbook_assignments_lesson_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workbook_assignments_lesson_idx ON public.workbook_assignments USING btree (lesson_id, sort);


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Name: gate_status gate_status_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER gate_status_set_updated_at BEFORE UPDATE ON public.gate_status FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lesson_progress lesson_progress_bump_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lesson_progress_bump_activity AFTER INSERT OR UPDATE ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.lesson_progress_activity_trigger();


--
-- Name: lesson_progress lesson_progress_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lesson_progress_set_updated_at BEFORE UPDATE ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lesson_templates lesson_templates_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lesson_templates_set_updated_at BEFORE UPDATE ON public.lesson_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lessons lessons_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lessons_set_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: profiles profiles_ensure_gate_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_ensure_gate_status AFTER INSERT OR UPDATE OF has_access ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.ensure_gate_status_row();


--
-- Name: profiles profiles_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: submissions submissions_refresh_portfolio_gate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER submissions_refresh_portfolio_gate AFTER INSERT OR DELETE OR UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.refresh_portfolio_gate();


--
-- Name: audit_queue audit_queue_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_queue
    ADD CONSTRAINT audit_queue_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE;


--
-- Name: audit_records audit_records_audit_queue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_records
    ADD CONSTRAINT audit_records_audit_queue_id_fkey FOREIGN KEY (audit_queue_id) REFERENCES public.audit_queue(id) ON DELETE CASCADE;


--
-- Name: audit_records audit_records_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_records
    ADD CONSTRAINT audit_records_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES auth.users(id);


--
-- Name: capstone_artifacts capstone_artifacts_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capstone_artifacts
    ADD CONSTRAINT capstone_artifacts_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.capstone_attempts(id) ON DELETE CASCADE;


--
-- Name: capstone_artifacts capstone_artifacts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capstone_artifacts
    ADD CONSTRAINT capstone_artifacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: capstone_attempts capstone_attempts_scenario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capstone_attempts
    ADD CONSTRAINT capstone_attempts_scenario_id_fkey FOREIGN KEY (scenario_id) REFERENCES public.capstone_scenarios(id) ON DELETE CASCADE;


--
-- Name: capstone_attempts capstone_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capstone_attempts
    ADD CONSTRAINT capstone_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: gate_status gate_status_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gate_status
    ADD CONSTRAINT gate_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: learning_activity learning_activity_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_activity
    ADD CONSTRAINT learning_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: lesson_progress lesson_progress_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: lesson_progress lesson_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: lesson_templates lesson_templates_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_templates
    ADD CONSTRAINT lesson_templates_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: mock_interview_responses mock_interview_responses_scenario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_interview_responses
    ADD CONSTRAINT mock_interview_responses_scenario_id_fkey FOREIGN KEY (scenario_id) REFERENCES public.mock_interview_scenarios(id) ON DELETE CASCADE;


--
-- Name: mock_interview_responses mock_interview_responses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_interview_responses
    ADD CONSTRAINT mock_interview_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: purchases purchases_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quiz_attempts quiz_attempts_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: quiz_attempts quiz_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quiz_item_seen quiz_item_seen_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_item_seen
    ADD CONSTRAINT quiz_item_seen_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: quiz_item_seen quiz_item_seen_quiz_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_item_seen
    ADD CONSTRAINT quiz_item_seen_quiz_item_id_fkey FOREIGN KEY (quiz_item_id) REFERENCES public.quiz_items(id) ON DELETE CASCADE;


--
-- Name: quiz_item_seen quiz_item_seen_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_item_seen
    ADD CONSTRAINT quiz_item_seen_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quiz_items quiz_items_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_items
    ADD CONSTRAINT quiz_items_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: rubric_scores rubric_scores_rubric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_scores
    ADD CONSTRAINT rubric_scores_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.rubrics(id) ON DELETE RESTRICT;


--
-- Name: rubric_scores rubric_scores_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_scores
    ADD CONSTRAINT rubric_scores_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE;


--
-- Name: submissions submissions_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: submissions submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tutor_messages tutor_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_messages
    ADD CONSTRAINT tutor_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: workbook_assignment_seen workbook_assignment_seen_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workbook_assignment_seen
    ADD CONSTRAINT workbook_assignment_seen_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.workbook_assignments(id) ON DELETE CASCADE;


--
-- Name: workbook_assignment_seen workbook_assignment_seen_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workbook_assignment_seen
    ADD CONSTRAINT workbook_assignment_seen_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: workbook_assignment_seen workbook_assignment_seen_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workbook_assignment_seen
    ADD CONSTRAINT workbook_assignment_seen_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: workbook_assignments workbook_assignments_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workbook_assignments
    ADD CONSTRAINT workbook_assignments_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


