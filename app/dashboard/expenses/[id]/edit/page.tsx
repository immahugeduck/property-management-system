import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { ExpenseForm } from "@/components/forms/expense-form"

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  const { id } = await params

  const { data: expense } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!expense) {
    notFound()
  }

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true })

  return (
    <div className="max-w-3xl mx-auto">
      <ExpenseForm 
        expense={expense} 
        properties={properties || []} 
        userId={user.id}
      />
    </div>
  )
}
