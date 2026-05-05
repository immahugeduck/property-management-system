"use client"

import { Button } from "@/components/ui/button"
import { Printer, Download, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface PrintLayoutProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  generatedAt?: Date
}

export function PrintLayout({ title, subtitle, children, generatedAt = new Date() }: PrintLayoutProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Screen-only header with actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-8">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle && <p className="text-gray-600 text-sm mt-1">{subtitle}</p>}
          </div>
          <div className="text-right text-sm text-gray-500">
            <p className="font-semibold">Property HQ</p>
            <p>Generated: {generatedAt.toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Report content */}
      <div className="print:text-black">
        {children}
      </div>

      {/* Print-only footer */}
      <div className="hidden print:block mt-8 pt-4 border-t text-center text-sm text-gray-500">
        <p>Property HQ - Property Management System</p>
        <p>Page generated on {generatedAt.toLocaleString()}</p>
      </div>
    </div>
  )
}
