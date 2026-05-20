import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ExpenseForm } from "@/components/forms/expense-form"

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true })

  const params = await searchParams
  const defaultPropertyId = params.property

  return (
    <div className="max-w-3xl mx-auto">
      <ExpenseForm 
        properties={properties || []} 
        userId={user.id}
        defaultPropertyId={defaultPropertyId}
      />
    </div>
  )
}
