'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Send, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { api } from '@/trpc/react'

type EmailStatus = 'PENDING' | 'SENT' | 'FAILED'

const statusConfig: Record<EmailStatus, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  PENDING: { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Wachtend' },
  SENT: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Verzonden' },
  FAILED: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Mislukt' },
}

export default function SentEmailsPage() {
  // For now, get sent emails from a project - we'll add getAllSentEmails later
  const { data: emails, isLoading } = api.projectEmails.getSentEmails.useQuery(
    { projectId: '', limit: 100 },
    { enabled: false } // Disable for now until we add getAllSentEmails
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verzonden E-mails</h1>
        <p className="text-muted-foreground">
          Overzicht van alle verzonden e-mails en hun status
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totaal Verzonden</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Alle e-mails</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Succesvol</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Afgeleverd</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mislukt</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Niet afgeleverd</p>
          </CardContent>
        </Card>
      </div>

      {/* Emails Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            <CardTitle>E-mail Geschiedenis</CardTitle>
          </div>
          <CardDescription>
            Alle verzonden e-mails met status en details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Binnenkort beschikbaar</p>
            <p className="text-sm">
              Deze pagina toont straks alle verzonden e-mails met hun status.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
