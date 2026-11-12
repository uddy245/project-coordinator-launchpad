/**
 * db/migrations/20261111_02_quiz_lesson_17_overrule_boundary.sql
 *
 * Runs the real SQL file against the local replica, starting from the 20
 * hand-authored lesson 17 quiz items exactly as production has them
 * (supabase/migrations/20260709_seed_quiz_lesson_17_pushback.sql).
 *
 * Guards:
 *  1. Q7, Q11 and Q16 end up as approved; the other 17 items do not change.
 *  2. Each edited item is still a valid question: the correct answer is one
 *     of its options and every other option has a rationale.
 *  3. A second apply changes nothing; with no lesson or no items it is a no-op.
 *  4. Only the original hand-authored items are edited. quiz_items has no
 *     unique (lesson_id, sort): AI-generated items take their sort from model
 *     output, and an admin can replace a lesson's questions, so another
 *     question can sit at sort 7, 11 or 16.
 *
 * Runs only when TEST_DATABASE_URL points at a local replica. Every test
 * runs in a transaction that is rolled back (tests/db/migration-sandbox.ts).
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { migrationForSandbox, readRepoFile, replicaClient } from "../db/migration-sandbox";

const DB_AVAILABLE = !!process.env.TEST_DATABASE_URL;

const MIGRATION = "db/migrations/20261111_02_quiz_lesson_17_overrule_boundary.sql";
const QUIZ_SEED = "supabase/migrations/20260709_seed_quiz_lesson_17_pushback.sql";
const EDITED_SORTS = [7, 11, 16];

type Option = { id: string; text: string };
type Item = {
  sort: number;
  stem: string;
  options: Option[];
  correct: string;
  distractor_rationale: Record<string, string>;
  competency: string;
  difficulty: string;
  is_ai_generated: boolean;
};

describe.skipIf(!DB_AVAILABLE)("migration: lesson 17 quiz overrule boundary", () => {
  const client = replicaClient();
  let migration = "";
  let quizSeed = "";
  let notices: string[] = [];

  async function items(): Promise<Item[]> {
    const { rows } = await client.query<Item>(
      `select qi.sort, qi.stem, qi.options, qi.correct, qi.distractor_rationale,
              qi.competency, qi.difficulty, qi.is_ai_generated
         from public.quiz_items qi
         join public.lessons l on l.id = qi.lesson_id
        where l.slug = 'push-back'
        order by qi.sort, qi.is_ai_generated, qi.stem`
    );
    return rows;
  }

  const handAuthored = (rows: Item[], sort: number) =>
    rows.filter((r) => r.sort === sort && !r.is_ai_generated)[0];

  async function addLesson() {
    await client.query(
      `insert into public.lessons (slug, number, title, competency, prompt_name)
       values ('push-back', 17, 'When to Push Back', 'pushback_judgment', 'grade-pushback')`
    );
  }

  // A question that is not one of the originals, sitting at a given sort.
  async function addOtherItem(sort: number, isAiGenerated: boolean) {
    await client.query(
      `insert into public.quiz_items
         (lesson_id, sort, stem, options, correct, distractor_rationale, competency, difficulty, is_ai_generated)
       select id, $1::int, 'An unrelated question at sort ' || $1::int,
              '[{"id": "a", "text": "Yes"}, {"id": "b", "text": "No"}]'::jsonb, 'a',
              '{"b": "Not this one."}'::jsonb, 'pushback_judgment', 'easy', $2
         from public.lessons where slug = 'push-back'`,
      [sort, isAiGenerated]
    );
  }

  beforeAll(async () => {
    migration = migrationForSandbox(MIGRATION);
    quizSeed = readRepoFile(QUIZ_SEED);
    await client.connect();
    client.on("notice", (msg) => notices.push(msg.message ?? ""));
  });

  beforeEach(async () => {
    await client.query("begin");
    await client.query(`delete from public.lessons where slug = 'push-back'`);
    notices = [];
  });

  afterEach(async () => {
    await client.query("rollback");
  });

  afterAll(async () => {
    await client.end();
  });

  describe("from the production state (the 20 hand-authored items)", () => {
    let before: Item[] = [];

    beforeEach(async () => {
      await addLesson();
      await client.query(quizSeed);
      before = await items();
    });

    it("starts from 20 items with sorts 1 to 20", () => {
      expect(before.map((r) => r.sort)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    });

    it("leaves the other 17 items exactly as they were, and the count at 20", async () => {
      await client.query(migration);

      const after = await items();
      expect(after).toHaveLength(20);
      const untouched = (rows: Item[]) => rows.filter((r) => !EDITED_SORTS.includes(r.sort));
      expect(untouched(after)).toEqual(untouched(before));
    });

    it("edits all three items without raising a notice", async () => {
      await client.query(migration);

      expect(notices).toEqual([]);
    });

    it("Q7: limits the stem to judgement calls and rewords two rationales only", async () => {
      await client.query(migration);

      const was = handAuthored(before, 7);
      const now = handAuthored(await items(), 7);
      expect(now.stem).toMatch(/^On a judgement call/);
      expect(now.distractor_rationale.a).toBe(was.distractor_rationale.a);
      expect(now.distractor_rationale.c).toMatch(/known inaccuracy/);
      expect(now.distractor_rationale.d).toMatch(/something you know is false/);
      expect({ ...now, stem: "", distractor_rationale: {} }).toEqual({
        ...was,
        stem: "",
        distractor_rationale: {},
      });
    });

    it("Q11: rewords option (b) only", async () => {
      await client.query(migration);

      const was = handAuthored(before, 11);
      const now = handAuthored(await items(), 11);
      const text = (item: Item, id: string) => item.options.find((o) => o.id === id)?.text;
      expect(text(now, "b")).toContain("a worse failure");
      expect(text(was, "b")).toContain("a different failure");
      for (const id of ["a", "c", "d"]) expect(text(now, id)).toBe(text(was, id));
      expect({ ...now, options: [] }).toEqual({ ...was, options: [] });
    });

    it("Q16: is replaced by the known-inaccuracy item, answer (c), hard", async () => {
      await client.query(migration);

      const now = handAuthored(await items(), 16);
      expect(now.stem).toMatch(/still says send it unchanged/);
      expect(now.correct).toBe("c");
      expect(now.difficulty).toBe("hard");
      expect(now.competency).toBe("pushback_judgment");
      expect(now.is_ai_generated).toBe(false);
    });

    it("keeps each edited item answerable: correct is an option, the rest have rationales", async () => {
      await client.query(migration);

      const after = await items();
      for (const sort of EDITED_SORTS) {
        const item = handAuthored(after, sort);
        const ids = item.options.map((o) => o.id);
        expect(ids).toEqual(["a", "b", "c", "d"]);
        expect(ids).toContain(item.correct);
        expect(Object.keys(item.distractor_rationale).sort()).toEqual(
          ids.filter((id) => id !== item.correct)
        );
      }
    });

    it("is idempotent: a second apply changes nothing", async () => {
      await client.query(migration);
      const afterFirst = await items();

      await client.query(migration);

      expect(await items()).toEqual(afterFirst);
    });

    it("does not touch an AI-generated item that shares a sort with an edited item", async () => {
      for (const sort of EDITED_SORTS) await addOtherItem(sort, true);
      const aiBefore = (await items()).filter((r) => r.is_ai_generated);

      await client.query(migration);

      const after = await items();
      expect(after.filter((r) => r.is_ai_generated)).toEqual(aiBefore);
      expect(handAuthored(after, 16).correct).toBe("c");
    });
  });

  describe("when the lesson's questions have been replaced", () => {
    it("does not overwrite a hand-authored question that is not the original", async () => {
      await addLesson();
      for (const sort of EDITED_SORTS) await addOtherItem(sort, false);
      const before = await items();

      await client.query(migration);
      await client.query(migration);

      expect(await items()).toEqual(before);
      expect(notices).toHaveLength(2);
      expect(notices[0]).toContain("0 of 3 items edited");
    });
  });

  describe("with nothing to edit", () => {
    it("is a no-op when lesson 17 has no quiz items", async () => {
      await addLesson();

      await client.query(migration);
      await client.query(migration);

      expect(await items()).toEqual([]);
    });

    it("is a no-op when lesson 17 does not exist", async () => {
      await client.query(migration);
      await client.query(migration);

      const { rows } = await client.query(`select 1 from public.lessons where slug = 'push-back'`);
      expect(rows).toEqual([]);
    });
  });
});
