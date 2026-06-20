import Link from "next/link"
import Image from "next/image"
import { validateInvite } from "@/app/actions/tenant-invites"
import { AcceptInviteForm } from "@/components/portal/accept-invite-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const result = await validateInvite(token || "")

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Link href="/" className="flex items-center justify-center mb-2">
            <Image src="/logo.png" alt="Property HQ" width={180} height={50} className="h-10 w-auto object-contain" priority />
          </Link>

          {result.valid ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Set up your portal</CardTitle>
                <CardDescription>
                  Create a password for <span className="font-medium text-foreground">{result.email}</span> to access your tenant portal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AcceptInviteForm token={token || ""} email={result.email} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Invite unavailable</CardTitle>
                <CardDescription>{result.error}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  If you already set up your account, you can{" "}
                  <Link href="/auth/login" className="underline underline-offset-4">
                    log in here
                  </Link>
                  . Otherwise, contact your property manager for a new invite.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
