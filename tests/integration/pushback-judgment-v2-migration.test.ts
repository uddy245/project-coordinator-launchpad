/**
 * db/migrations/20261111_01_pushback_judgment_v2.sql
 *
 * Runs the real SQL file against the local replica, starting from the state
 * production is in today: lesson 17, rubric v1 and prompt v1 as seeded by
 * supabase/migrations/20260620_seed_pushback_judgment_rubric_prompt.sql.
 *
 * Guards:
 *  1. What the migration installs is what calibration graded with — the
 *     rubric equals docs/rubrics/pushback-judgment-v2.json, every line of the
 *     stored prompt comes from docs/prompts/grade-pushback-v2.md, and the
 *     scenario changes only in task item 3, which is worded exactly as in
 *     tests/fixtures/pushback_judgment/scenario.txt.
 *  2. v1 rows are kept and exactly one version is current afterwards.
 *  3. Learners' default workbook brief is the grader's scenario.
 *  4. A second apply changes nothing, and the migration is safe when the
 *     lesson, its scenario, or the v1 rows are missing.
 *  5. If the live scenario is neither the v1 seed text nor the v2 text, the
 *     migration raises and nothing is applied.
 *
 * Runs only when TEST_DATABASE_URL points at a local replica. Every test
 * runs in a transaction that is rolled back (tests/db/migration-sandbox.ts).
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { migrationForSandbox, readRepoFile, replicaClient } from "../db/migration-sandbox";

const DB_AVAILABLE = !!process.env.TEST_DATABASE_URL;

const MIGRATION = "db/migrations/20261111_01_pushback_judgment_v2.sql";
const V1_SEED = "supabase/migrations/20260620_seed_pushback_judgment_rubric_prompt.sql";
const OLD_ITEM_3 = "if, knowing this, she still says send, you send";
const BRIEF_TITLE = "Board pre-read push-back — IAM modernisation";

describe.skipIf(!DB_AVAILABLE)("migration: push-back judgment v2", () => {
  const client = replicaClient();
  let migration = "";
  let v1Seed = "";

  type Versioned = { version: number; is_current: boolean };

  async function rubrics() {
    const { rows } = await client.query<Versioned & { schema_json: unknown }>(
      `select version, is_current, schema_json from public.rubrics
        where competency = 'pushback_judgment' order by version`
    );
    return rows;
  }

  async function prompts() {
    const { rows } = await client.query<Versioned & { body: string }>(
      `select version, is_current, body from public.prompts
        where name = 'grade-pushback' order by version`
    );
    return rows;
  }

  async function lesson() {
    const { rows } = await client.query<{
      id: string;
      scenario_text: string | null;
      summary: string | null;
    }>(`select id, scenario_text, summary from public.lessons where slug = 'push-back'`);
    return rows[0];
  }

  async function briefs() {
    const { rows } = await client.query<{
      title: string;
      brief: string;
      is_default: boolean;
      is_ai_generated: boolean;
    }>(
      `select wa.title, wa.brief, wa.is_default, wa.is_ai_generated
         from public.workbook_assignments wa
         join public.lessons l on l.id = wa.lesson_id
        where l.slug = 'push-back' order by wa.sort, wa.title`
    );
    return rows;
  }

  // Everything the migration can touch, minus timestamps it refreshes.
  async function snapshot() {
    return {
      lesson: await lesson(),
      rubrics: await rubrics(),
      prompts: await prompts(),
      briefs: await briefs(),
    };
  }

  async function addBrief(title: string, isDefault: boolean, isAi: boolean) {
    await client.query(
      `insert into public.workbook_assignments (lesson_id, title, brief, is_default, is_ai_generated, sort)
       select id, $1, 'Brief text for ' || $1, $2, $3, $4 from public.lessons where slug = 'push-back'`,
      [title, isDefault, isAi, isDefault ? 1 : 100]
    );
  }

  // The replica build has already applied the migration to empty tables.
  // Clear that, so each test chooses its own starting state.
  async function clearPushback() {
    await client.query(`delete from public.lessons where slug = 'push-back'`);
    await client.query(`delete from public.rubrics where competency = 'pushback_judgment'`);
    await client.query(`delete from public.prompts where name = 'grade-pushback'`);
  }

  beforeAll(async () => {
    migration = migrationForSandbox(MIGRATION);
    v1Seed = readRepoFile(V1_SEED);
    await client.connect();
  });

  beforeEach(async () => {
    await client.query("begin");
    await clearPushback();
  });

  afterEach(async () => {
    await client.query("rollback");
  });

  afterAll(async () => {
    await client.end();
  });

  describe("from the production state (lesson 17 with rubric and prompt v1)", () => {
    beforeEach(async () => {
      await client.query(v1Seed);
      await addBrief("Old default brief", true, false);
      await addBrief("Generated alternative", false, true);
    });

    it("starts from v1 current and the old task item 3", async () => {
      expect((await rubrics()).map((r) => [r.version, r.is_current])).toEqual([[1, true]]);
      expect((await prompts()).map((p) => [p.version, p.is_current])).toEqual([[1, true]]);
      expect((await lesson()).scenario_text).toContain(OLD_ITEM_3);
    });

    it("changes task item 3 of the scenario, and nothing else in it", async () => {
      // Trailing whitespace is ignored: the v1 seed ends with two stray spaces.
      const lines = (text: string | null) => (text ?? "").split("\n").map((l) => l.trimEnd());
      const before = lines((await lesson()).scenario_text);

      await client.query(migration);

      const after = lines((await lesson()).scenario_text);
      expect(after).toHaveLength(before.length);
      const changed = after.filter((line, i) => line !== before[i]);
      expect(changed).toHaveLength(1);
      expect(changed[0]).toMatch(/^3\. /);
      expect(after.join("\n")).not.toContain(OLD_ITEM_3);
    });

    it("words task item 3 exactly as the scenario calibration graded against", async () => {
      await client.query(migration);

      // The stored scenario is a condensed form of the fixture (as it was for
      // v1), so only the reworded item is compared verbatim.
      const item3 = (text: string) => text.split("\n").filter((line) => line.startsWith("3. "));
      const fixture = readRepoFile("tests/fixtures/pushback_judgment/scenario.txt");
      const stored = (await lesson()).scenario_text ?? "";
      expect(item3(stored)).toHaveLength(1);
      expect(item3(stored)).toEqual(item3(fixture));
      expect((await lesson()).summary).toMatch(/\S/);
    });

    it("installs rubric v2 as current, identical to the repo copy, and keeps v1", async () => {
      await client.query(migration);

      const rows = await rubrics();
      expect(rows.map((r) => [r.version, r.is_current])).toEqual([
        [1, false],
        [2, true],
      ]);
      const repoCopy = JSON.parse(readRepoFile("docs/rubrics/pushback-judgment-v2.json"));
      expect(rows[1].schema_json).toEqual(repoCopy);
    });

    it("installs prompt v2 as current, drawn from the repo copy, and keeps v1", async () => {
      await client.query(migration);

      const rows = await prompts();
      expect(rows.map((p) => [p.version, p.is_current])).toEqual([
        [1, false],
        [2, true],
      ]);

      const body = rows[1].body;
      for (const placeholder of ["{{rubric_json}}", "{{scenario_text}}", "{{submission_text}}"]) {
        expect(body.split(placeholder)).toHaveLength(2);
      }

      // The stored body is the system prompt plus the user template. The
      // repo file wraps those in documentation headings, so compare by line.
      const repoLines = new Set(
        readRepoFile("docs/prompts/grade-pushback-v2.md")
          .split("\n")
          .map((line) => line.trim())
      );
      const strays = body
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "" && !repoLines.has(line));
      expect(strays).toEqual([]);
    });

    it("makes the default workbook brief the grader's scenario and leaves other briefs alone", async () => {
      await client.query(migration);

      const scenario = (await lesson()).scenario_text;
      expect(await briefs()).toEqual([
        { title: BRIEF_TITLE, brief: scenario, is_default: true, is_ai_generated: false },
        {
          title: "Generated alternative",
          brief: "Brief text for Generated alternative",
          is_default: false,
          is_ai_generated: true,
        },
      ]);
    });

    it("is idempotent: a second apply changes nothing", async () => {
      await client.query(migration);
      const afterFirst = await snapshot();

      await client.query(migration);

      expect(await snapshot()).toEqual(afterFirst);
    });

    it("makes v2 current again after a rollback to v1", async () => {
      await client.query(migration);
      await client.query(
        `update public.rubrics set is_current = false where competency = 'pushback_judgment' and version = 2;
         update public.rubrics set is_current = true where competency = 'pushback_judgment' and version = 1;
         update public.prompts set is_current = false where name = 'grade-pushback' and version = 2;
         update public.prompts set is_current = true where name = 'grade-pushback' and version = 1;`
      );

      await client.query(migration);

      expect((await rubrics()).map((r) => [r.version, r.is_current])).toEqual([
        [1, false],
        [2, true],
      ]);
      expect((await prompts()).map((p) => [p.version, p.is_current])).toEqual([
        [1, false],
        [2, true],
      ]);
    });
  });

  describe("when the live scenario was edited after the v1 seed", () => {
    const EDITED = "An admin rewrote this scenario by hand.";

    beforeEach(async () => {
      await client.query(v1Seed);
      await addBrief("Old default brief", true, false);
      await client.query(`update public.lessons set scenario_text = $1 where slug = 'push-back'`, [
        EDITED,
      ]);
    });

    it("raises and applies nothing — scenario, rubric, prompt and brief are untouched", async () => {
      const before = await snapshot();

      await client.query("savepoint before_migration");
      await expect(client.query(migration)).rejects.toThrow(
        /push-back scenario_text is not the expected v1 text/
      );
      await client.query("rollback to savepoint before_migration");

      const after = await snapshot();
      expect(after).toEqual(before);
      expect(after.lesson.scenario_text).toBe(EDITED);
      expect(after.rubrics.map((r) => [r.version, r.is_current])).toEqual([[1, true]]);
      expect(after.prompts.map((p) => [p.version, p.is_current])).toEqual([[1, true]]);
    });

    it("also refuses a v1 text with only task item 3 hand-edited", async () => {
      await client.query(v1Seed); // restores the exact v1 scenario (on conflict do update)
      await client.query(
        `update public.lessons
            set scenario_text = replace(scenario_text, $1, 'if she still says send, you send')
          where slug = 'push-back'`,
        [OLD_ITEM_3]
      );

      await client.query("savepoint before_migration");
      await expect(client.query(migration)).rejects.toThrow(/refusing to overwrite/);
      await client.query("rollback to savepoint before_migration");
    });
  });

  describe("from an empty database (no lesson 17, no rubric, no prompt)", () => {
    it("installs rubric and prompt v2 and creates no lesson or brief", async () => {
      await client.query(migration);
      await client.query(migration);

      expect((await rubrics()).map((r) => [r.version, r.is_current])).toEqual([[2, true]]);
      expect((await prompts()).map((p) => [p.version, p.is_current])).toEqual([[2, true]]);
      expect(await lesson()).toBeUndefined();
      expect(await briefs()).toEqual([]);
    });
  });

  describe("when lesson 17 exists with no scenario, summary or default brief", () => {
    beforeEach(async () => {
      await client.query(
        `insert into public.lessons (slug, number, title, summary, scenario_text, competency, prompt_name)
         values ('push-back', 17, 'When to Push Back', null, null, 'pushback_judgment', 'grade-pushback')`
      );
    });

    it("fills the scenario and creates exactly one default brief, once", async () => {
      await client.query(migration);
      await client.query(migration);

      const row = await lesson();
      expect(row.scenario_text).toMatch(/\S/);
      expect(row.summary).toMatch(/\S/);
      expect(await briefs()).toEqual([
        { title: BRIEF_TITLE, brief: row.scenario_text, is_default: true, is_ai_generated: false },
      ]);
    });
  });
});
