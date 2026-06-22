import { redirect } from "next/navigation"

export default function IncomeStatementRedirect() {
  redirect("/dashboard/reports/profit-loss")
}
