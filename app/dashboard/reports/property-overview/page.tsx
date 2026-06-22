import { redirect } from "next/navigation"

export default function PropertyOverviewRedirect() {
  redirect("/dashboard/reports/occupancy")
}
