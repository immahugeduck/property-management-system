"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { KeyRound, Mail, Copy, Check, Loader2, ShieldCheck } from "lucide-react"
import { inviteTenant } from "@/app/actions/tenant-invites"

interface PortalAccessCardProps {
  tenantId: string
  hasEmail: boolean
  authUserId: string | null
  invitedAt: string | null
  portalActivatedAt: string | null
}

export function PortalAccessCard({
  tenantId,
  hasEmail,
  authUserId,
  invitedAt,
  portalActivatedAt,
}: PortalAccessCardProps) {
  const [loading, setLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState(false)

  const activated = Boolean(authUserId || portalActivatedAt)
  const invited = Boolean(invitedAt)

  async function handleInvite() {
    setLoading(true)
    setError(null)
    const res = await inviteTenant(tenantId)
    setLoading(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setSent(true)
    if (res.inviteUrl) setInviteUrl(res.inviteUrl)
  }

  async function copyLink() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Portal Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activated ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-foreground">Portal active</p>
              <p className="text-xs text-muted-foreground">
                This tenant can log in with their email and password.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {invited ? "Invite sent — awaiting setup" : "No portal access yet"}
              </p>
              {invited && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                  Pending
                </Badge>
              )}
            </div>

            {!hasEmail ? (
              <p className="text-sm text-destructive">
                Add an email address to this tenant before inviting them.
              </p>
            ) : (
              <Button onClick={handleInvite} disabled={loading} className="w-full justify-start">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                {invited ? "Resend invite" : "Invite to portal"}
              </Button>
            )}

            {sent && (
              <p className="text-sm text-green-600">
                Invite created. If email delivery is configured, the tenant received it. You can also copy the link below and share it directly.
              </p>
            )}

            {inviteUrl && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
                <code className="flex-1 truncate text-xs text-muted-foreground">{inviteUrl}</code>
                <Button size="sm" variant="ghost" onClick={copyLink}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
