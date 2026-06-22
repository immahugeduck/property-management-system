import { redirect } from "next/navigation"

export default function MaintenanceSummaryRedirect() {
  redirect("/dashboard/reports/maintenance-costs")
}
