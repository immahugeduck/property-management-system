import { redirect } from "next/navigation"

export default function PaymentHistoryRedirect() {
  redirect("/dashboard/reports/rent-collection")
}
