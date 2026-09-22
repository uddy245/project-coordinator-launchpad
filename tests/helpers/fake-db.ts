/**
 * Minimal stand-in for the Drizzle `db` in unit tests.
 *
 * Every query builder chain is accepted as-is; when the chain is awaited the
 * test's `handler` decides the result from the recorded call (operation,
 * table name, inserted values / update set). Return an Error to make the
 * query reject (Drizzle throws where Supabase returned `{ error }`).
 *
 *   const fake = createFakeDb((q) => (q.op === "select" && q.table === "lessons" ? [{ id: "l1" }] : []));
 *   vi.mock("@/db", () => ({ db: fake.db }));
 *
 * Access-control behaviour (WHERE clauses) is covered by the DB-backed tests
 * in tests/integration, not here.
 */
import { getTableName, type Table } from "drizzle-orm";

export type DbCall = {
  op: "select" | "insert" | "update" | "delete" | "execute";
  table?: string;
  values?: unknown;
  set?: unknown;
  /** Methods called on the chain, in order (e.g. ["from", "where", "limit"]). */
  chain: string[];
};

export type DbHandler = (call: DbCall) => unknown;

function tableName(t: unknown): string | undefined {
  try {
    return getTableName(t as Table);
  } catch {
    return undefined;
  }
}

export function createFakeDb(initialHandler: DbHandler = () => []) {
  let handler = initialHandler;
  const calls: DbCall[] = [];

  function builder(call: DbCall): unknown {
    const run = () => {
      calls.push(call);
      try {
        const r = handler(call);
        return r instanceof Error ? Promise.reject(r) : Promise.resolve(r);
      } catch (err) {
        return Promise.reject(err);
      }
    };
    const proxy: unknown = new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === "then") {
            return (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
              run().then(res, rej);
          }
          if (prop === "catch") return (fn: (e: unknown) => unknown) => run().catch(fn);
          if (prop === "finally") return (fn: () => void) => run().finally(fn);
          return (...args: unknown[]) => {
            const name = String(prop);
            call.chain.push(name);
            if (name === "from" && !call.table) call.table = tableName(args[0]);
            if (name === "values") call.values = args[0];
            if (name === "set") call.set = args[0];
            return proxy;
          };
        },
      }
    );
    return proxy;
  }

  const db = {
    select: (..._a: unknown[]) => builder({ op: "select", chain: [] }),
    selectDistinct: (..._a: unknown[]) => builder({ op: "select", chain: [] }),
    insert: (t: unknown) => builder({ op: "insert", table: tableName(t), chain: [] }),
    update: (t: unknown) => builder({ op: "update", table: tableName(t), chain: [] }),
    delete: (t: unknown) => builder({ op: "delete", table: tableName(t), chain: [] }),
    execute: (..._a: unknown[]) => builder({ op: "execute", chain: [] }),
    transaction: async <T>(cb: (tx: unknown) => Promise<T>) => cb(db),
  };

  return {
    db,
    calls,
    setHandler(h: DbHandler) {
      handler = h;
    },
    reset(h: DbHandler = () => []) {
      handler = h;
      calls.length = 0;
    },
    /** Executed calls matching an operation (and optionally a table). */
    callsFor(op: DbCall["op"], table?: string) {
      return calls.filter((c) => c.op === op && (!table || c.table === table));
    },
  };
}
