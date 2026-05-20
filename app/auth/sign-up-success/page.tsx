import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Mail, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">Property HQ</span>
        </div>
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-emerald-500/10 rounded-full">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
            <CardTitle className="text-xl">Account created!</CardTitle>
            <CardDescription>Check your email to confirm your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-secondary rounded-lg">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                We sent a confirmation link to your email address. Click the link to activate your Property HQ account.
              </p>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/auth/login">Back to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
