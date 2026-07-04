"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { SignaturePad } from "@/components/leases/signature-pad"
import type { LeaseField, LeaseValue } from "@/lib/types"

interface Props {
  field: LeaseField
  value: LeaseValue | undefined
  onChange: (value: LeaseValue | null) => void
  disabled?: boolean
}

export function LeaseFieldInput({ field, value, onChange, disabled }: Props) {
  const required = field.required

  if (field.type === "signature") {
    return (
      <SignaturePad
        label={`${field.label}${required ? " *" : ""}`}
        value={typeof value === "string" ? value : null}
        onChange={(v) => onChange(v)}
        disabled={disabled}
      />
    )
  }

  if (field.type === "checkbox") {
    return (
      <div className="flex items-center gap-2 py-1">
        <Checkbox
          id={field.key}
          checked={value === true || value === "true"}
          disabled={disabled}
          onCheckedChange={(c) => onChange(c === true)}
        />
        <Label htmlFor={field.key} className="text-sm font-normal">
          {field.label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.key} className="text-sm">
        {field.label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        id={field.key}
        type={field.type === "date" ? "date" : "text"}
        value={typeof value === "string" ? value : ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
