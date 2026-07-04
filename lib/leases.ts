import type { LeaseField, LeaseFieldRole, LeaseStatus, LeaseValues } from "@/lib/types"

/**
 * Pure, client-safe helpers for the lease e-sign system. No database or
 * server-only imports here so both server actions and client forms can use it.
 */

export const LEASE_STATUS_LABEL: Record<LeaseStatus, string> = {
  draft: "Draft",
  sent: "Awaiting signature",
  signed: "Signed",
  void: "Void",
}

export const LEASE_STATUS_STYLE: Record<LeaseStatus, string> = {
  draft: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  sent: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  signed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  void: "bg-red-500/10 text-red-500 border-red-500/20",
}

export interface PrefillContext {
  tenantFirst?: string | null
  tenantLast?: string | null
  managerName?: string | null
  propAddress?: string | null
  propCity?: string | null
  propState?: string | null
}

/** Resolves an auto-fill `source` key (e.g. "tenant.full") to a concrete value. */
export function resolvePrefill(source: string | null, ctx: PrefillContext): string {
  if (!source) return ""
  switch (source) {
    case "tenant.full":
      return [ctx.tenantFirst, ctx.tenantLast].filter(Boolean).join(" ").trim()
    case "manager.name":
      return (ctx.managerName || "").trim()
    case "property.address":
      return (ctx.propAddress || "").trim()
    case "property.city":
      return (ctx.propCity || "").trim()
    case "property.state":
      return (ctx.propState || "").trim()
    default:
      return ""
  }
}

export function fieldsForRole(fields: LeaseField[], role: LeaseFieldRole): LeaseField[] {
  return fields.filter((f) => f.role === role)
}

/** Groups fields by their page number, ascending, preserving field order within a page. */
export function groupFieldsByPage(fields: LeaseField[]): { page: number; fields: LeaseField[] }[] {
  const map = new Map<number, LeaseField[]>()
  for (const f of fields) {
    const list = map.get(f.page)
    if (list) list.push(f)
    else map.set(f.page, [f])
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([page, pageFields]) => ({ page, fields: pageFields }))
}

function isFilled(field: LeaseField, value: unknown): boolean {
  if (field.type === "checkbox") return value === true || value === "true"
  return typeof value === "string" && value.trim().length > 0
}

/** Returns the required fields (optionally scoped to a role) that are still empty. */
export function missingRequired(
  fields: LeaseField[],
  values: LeaseValues,
  role?: LeaseFieldRole,
): LeaseField[] {
  return fields
    .filter((f) => (role ? f.role === role : true))
    .filter((f) => f.required && !isFilled(f, values[f.key]))
}
