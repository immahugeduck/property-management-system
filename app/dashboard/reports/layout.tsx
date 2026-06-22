import { ReportsNav } from "@/components/reports/reports-nav"

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-0 -m-4 lg:-m-8 min-h-[calc(100vh-4rem)]">
      <div className="hidden lg:flex w-56 flex-col border-r bg-muted/20 print:hidden shrink-0">
        <ReportsNav />
      </div>
      <div className="flex-1 min-w-0 p-4 lg:p-8 overflow-auto">
        {children}
      </div>
    </div>
  )
}
