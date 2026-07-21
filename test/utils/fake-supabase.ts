import { vi } from "vitest"

/**
 * A minimal chainable fake of the Supabase JS client, good enough for the
 * server code under test. Query builders are thenable so both
 * `.select(...).eq(...).single()` (reads) and `await ...update(...).eq(...)`
 * (writes) resolve.
 *
 * - `read(table)` supplies the `{ data, error }` returned by `.single()`,
 *   `.maybeSingle()`, or awaiting a select chain.
 * - Every `update`/`insert` is recorded in the returned `writes` array so tests
 *   can assert what was persisted.
 */
export type WriteRecord = { table: string; op: "update" | "insert"; values: Record<string, unknown> }
export type ReadResult = { data: unknown; error: unknown }

export function createFakeSupabase(opts: { read?: (table: string) => ReadResult } = {}) {
  const writes: WriteRecord[] = []
  const read = opts.read ?? (() => ({ data: null, error: null }))

  function builder(table: string) {
    let writeOp: WriteRecord | null = null
    const b = {
      select: () => b,
      order: () => b,
      limit: () => b,
      eq: () => b,
      in: () => b,
      not: () => b,
      maybeSingle: () => Promise.resolve(read(table)),
      single: () => Promise.resolve(read(table)),
      update: (values: Record<string, unknown>) => {
        writeOp = { table, op: "update", values }
        return b
      },
      insert: (values: Record<string, unknown>) => {
        writeOp = { table, op: "insert", values }
        return b
      },
      then: (onFulfilled: (v: ReadResult) => unknown, onRejected?: (e: unknown) => unknown) => {
        if (writeOp) {
          writes.push(writeOp)
          return Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected)
        }
        return Promise.resolve(read(table)).then(onFulfilled, onRejected)
      },
    }
    return b
  }

  const client = { from: vi.fn((table: string) => builder(table)) }
  return { client: client as unknown as import("@supabase/supabase-js").SupabaseClient, writes }
}
