"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
export function OwnerPayoutForm({userId,owners}:{userId:string;owners:{id:string;first_name:string;last_name:string}[]}) {
 const router=useRouter()
 const [error,setError]=useState("")
 const [busy,setBusy]=useState(false)
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault()
  // Keep the form: React clears e.currentTarget once this handler awaits.
  const form=e.currentTarget
  setBusy(true);setError("")
  const f=new FormData(form)
  const amount=Number(f.get("amount"))
  if(!Number.isFinite(amount)||amount<=0){setError("Enter a positive payment amount.");setBusy(false);return}
  const owner_id=String(f.get("owner_id"))
  if(!owners.some(o=>o.id===owner_id)){setError("Select an owner from your account.");setBusy(false);return}
  const {error:saveError}=await createClient().from("owner_payouts").insert({
   user_id:userId,owner_id,amount,payout_date:String(f.get("payout_date")),
   payment_method:String(f.get("payment_method")).trim(),reference_number:String(f.get("reference_number")).trim()||null,
   notes:String(f.get("notes")).trim()||null
  })
  if(saveError){setError(saveError.message);setBusy(false);return}
  form.reset()
  setBusy(false)
  router.refresh()
 }
 return <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-4 print:hidden">
  <h2 className="text-lg font-semibold">Record an already completed payout</h2>
  <p className="text-sm text-muted-foreground">This does not send funds. Record only payments confirmed outside PropertyHQ. Never enter full bank account details.</p>
  {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  <div className="grid gap-3 sm:grid-cols-2">
   <div className="space-y-1"><Label htmlFor="owner">Owner</Label><select required id="owner" name="owner_id" className="w-full h-10 rounded-md border bg-background px-3"><option value="">Choose owner</option>{owners.map(o=><option key={o.id} value={o.id}>{o.first_name} {o.last_name}</option>)}</select></div>
   <div className="space-y-1"><Label htmlFor="amount">Amount ($)</Label><Input required id="amount" name="amount" type="number" min="0.01" step="0.01"/></div>
   <div className="space-y-1"><Label htmlFor="payout_date">Date paid</Label><Input required id="payout_date" name="payout_date" type="date" /></div>
   <div className="space-y-1"><Label htmlFor="method">Payment method</Label><Input required id="method" name="payment_method" placeholder="Check / ACH / cash"/></div>
   <div className="space-y-1 sm:col-span-2"><Label htmlFor="ref">Reference (optional)</Label><Input id="ref" name="reference_number" placeholder="Check # or transaction reference (no account numbers)" /></div>
  </div>
  <div className="space-y-1"><Label htmlFor="payout_notes">Notes</Label><Textarea id="payout_notes" name="notes" /></div>
  <Button type="submit" disabled={busy||!owners.length}>{busy?"Saving…":"Record payout"}</Button>
 </form>
}
