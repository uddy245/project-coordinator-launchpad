/**
 * db/migrations/20261111_03_lesson_20_single_scenario.sql
 *
 * Guards two properties of the lesson 20 "one scenario" data migration by
 * running the real SQL file against the local replica:
 *
 *  1. With a scenario on the lesson, every raid-logs brief (the old default
 *     and AI-generated alternatives) is replaced by ONE default brief equal
 *     to lessons.scenario_text, and a second run changes nothing.
 *  2. Without a scenario (NULL or blank) the migration is a no-op. It used
 *     to abort on workbook_assignments.brief NOT NULL for NULL, and to
 *     replace every brief with an empty default for a blank string.
 *
 * Runs only when TEST_DATABASE_URL points at a local replica
 * (tests/db/build-replica.sh). The replica seed gives raid-logs no
 * scenario_text, so without this test the insert path is never exercised.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";

const DB_AVAILABLE = !!process.env.TEST_DATABASE_URL;

const MIGRATION = readFileSync(
  resolve(__dirname, "../../db/migrations/20261111_03_lesson_20_single_scenario.sql"),
  "utf8"
);

const SCENARIO = "You are the coordinator on a healthcare systems integration pilot.";

describe.skipIf(!DB_AVAILABLE)("migration: lesson 20 single scenario", () => {
  const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  const userId = randomUUID();
  let lessonId = "";
  let originalScenario: string | null = null;

  type Brief = { title: string; brief: string; is_default: boolean; is_ai_generated: boolean };

  async function briefs(): Promise<Brief[]> {
    const { rows } = await client.query<Brief>(
      `select title, brief, is_default, is_ai_generated
         from public.workbook_assignments where lesson_id = $1 order by sort, title`,
      [lessonId]
    );
    return rows;
  }

  async function seenCount(): Promise<number> {
    const { rows } = await client.query<{ n: number }>(
      `select count(*)::int as n from public.workbook_assignment_seen where lesson_id = $1`,
      [lessonId]
    );
    return rows[0].n;
  }

  async function setScenario(text: string | null) {
    await client.query(`update public.lessons set scenario_text = $2 where id = $1`, [
      lessonId,
      text,
    ]);
  }

  // The pre-migration state: a different default brief, an AI-generated
  // alternative, and a learner who has already been shown the default.
  async function seedOldBriefs() {
    await client.query(`delete from public.workbook_assignments where lesson_id = $1`, [lessonId]);
    const { rows } = await client.query<{ id: string }>(
      `insert into public.workbook_assignments (lesson_id, title, brief, is_default, is_ai_generated, sort)
       values ($1, 'Halcyon cloud migration', 'Old default brief.', true, false, 1),
              ($1, 'Generated alternative', 'AI brief.', false, true, 100)
       returning id`,
      [lessonId]
    );
    await client.query(
      `insert into public.workbook_assignment_seen (user_id, assignment_id, lesson_id)
       values ($1, $2, $3)`,
      [userId, rows[0].id, lessonId]
    );
  }

  beforeAll(async () => {
    await client.connect();
    const { rows } = await client.query<{ id: string; scenario_text: string | null }>(
      `select id, scenario_text from public.lessons where slug = 'raid-logs'`
    );
    if (rows.length !== 1) throw new Error("need the raid-logs lesson seeded");
    lessonId = rows[0].id;
    originalScenario = rows[0].scenario_text;
    await client.query(`insert into auth.users (id, email) values ($1, $2)`, [
      userId,
      `test-l20-migration-${userId}@launchpad.test`,
    ]);
  });

  beforeEach(seedOldBriefs);

  afterAll(async () => {
    await client.query(`delete from public.workbook_assignments where lesson_id = $1`, [lessonId]);
    await client.query(`delete from auth.users where id = $1`, [userId]);
    await setScenario(originalScenario);
    await client.end();
  });

  it("replaces every brief with one default equal to the lesson scenario", async () => {
    await setScenario(`\n\n  ${SCENARIO}\r\n\t\n`);

    await client.query(MIGRATION);

    expect(await briefs()).toEqual([
      {
        title: "RAID log — healthcare systems integration pilot",
        brief: SCENARIO,
        is_default: true,
        is_ai_generated: false,
      },
    ]);
    // Seen rows for the removed briefs cascade, so learners get the default.
    expect(await seenCount()).toBe(0);
  });

  it("is idempotent: a second run leaves exactly the same single brief", async () => {
    await setScenario(SCENARIO);

    await client.query(MIGRATION);
    const afterFirst = await briefs();
    await client.query(MIGRATION);

    expect(await briefs()).toEqual(afterFirst);
    expect(afterFirst).toHaveLength(1);
  });

  it.each([
    ["NULL", null],
    ["empty", ""],
    ["whitespace-only", " \n\t\r\n "],
  ])("leaves existing briefs untouched when the scenario is %s", async (_label, scenario) => {
    await setScenario(scenario);
    const before = await briefs();

    await client.query(MIGRATION);
    await client.query(MIGRATION);

    expect(await briefs()).toEqual(before);
    expect(before).toHaveLength(2);
    expect(await seenCount()).toBe(1);
  });
});
