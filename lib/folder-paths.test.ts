import { describe, expect, it } from "vitest"
import { buildFolderOptions } from "./folder-paths"

describe("buildFolderOptions", () => {
  it("labels nested folders with their full path, sorted", () => {
    const options = buildFolderOptions([
      { id: "b", name: "2026", parent_id: "a" },
      { id: "a", name: "Leases", parent_id: null },
      { id: "c", name: "Insurance", parent_id: null },
    ])
    expect(options).toEqual([
      { id: "c", label: "Insurance" },
      { id: "a", label: "Leases" },
      { id: "b", label: "Leases / 2026" },
    ])
  })

  it("survives a parent cycle", () => {
    const options = buildFolderOptions([
      { id: "a", name: "A", parent_id: "b" },
      { id: "b", name: "B", parent_id: "a" },
    ])
    expect(options.map((o) => o.label)).toEqual(["A / B", "B / A"])
  })
})
