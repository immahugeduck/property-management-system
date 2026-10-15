import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { OwnerPayoutForm } from "@/components/owners/payout-form"
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n)
export default async function OwnerPayoutsPage(){
 const supabase=await createClient()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user) redirect("/auth/login")
 const [{data:owners,error:ownerError},{data:payouts,error:payoutError}]=await Promise.all([
  supabase.from("property_owners").select("id,first_name,last_name").eq("user_id",user.id).order("last_name"),
  supabase.from("owner_payouts").select("id,owner_id,amount,payout_date,payment_method,reference_number,notes").eq("user_id",user.id).order("payout_date",{ascending:false}).limit(100)
 ])
 const error=ownerError||payoutError
 if(error)return <p role="alert" className="text-destructive">Unable to load payout ledger: {error.message}</p>
 const names=new Map((owners||[]).map(o=>[o.id,`${o.first_name} ${o.last_name}`]))
 return <main className="space-y-6">
  <div><Link className="text-sm text-muted-foreground hover:underline" href="/dashboard/owners">← Owners</Link><h1 className="text-2xl font-bold mt-2">Owner Payout Ledger</h1><p className="text-sm text-muted-foreground">An audit record of manually completed disbursements—not a payment processor.</p></div>
  <OwnerPayoutForm userId={user.id} owners={owners||[]}/>
  <section className="rounded-xl border bg-card p-4"><h2 className="font-semibold mb-3">Recent payouts</h2>
  {!payouts?.length?<p className="text-sm text-muted-foreground">No recorded owner payouts.</p>:<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-2">Date</th><th>Owner</th><th>Method</th><th>Reference</th><th className="text-right">Amount</th></tr></thead><tbody>{payouts.map(p=><tr className="border-b last:border-0" key={p.id}><td className="py-2">{p.payout_date}</td><td>{names.get(p.owner_id)||"Unknown"}</td><td>{p.payment_method}</td><td>{p.reference_number||"—"}</td><td className="text-right tabular-nums">{money(Number(p.amount))}</td></tr>)}</tbody></table></div>}
  </section>
 </main>
}
