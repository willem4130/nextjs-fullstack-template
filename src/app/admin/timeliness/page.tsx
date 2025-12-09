'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Timer, Clock, FileText, DollarSign, AlertCircle } from 'lucide-react'
import { api } from '@/trpc/react'
import Link from 'next/link'

export default function TimelinessPage() {
  const { data: overview, isLoading } = api.dashboard.getOverview.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Timeliness Tracking</h1>
            <p className="text-muted-foreground">Loading timeliness data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Timeliness Tracking</h1>
            <p className="text-muted-foreground text-red-500">Failed to load timeliness data</p>
          </div>
        </div>
      </div>
    )
  }

  const timelinessData = overview.timeliness || {
    criticalAlerts: 0,
    pendingHoursUsers: 0,
    unsignedContracts: 0,
    overdueInvoices: 0,
  }

  const totalAlerts = timelinessData.criticalAlerts

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/dashboard">
          <ArrowLeft className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timeliness Tracking</h1>
          <p className="text-muted-foreground">
            Administrative health monitoring and bottleneck detection
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <Card className={totalAlerts > 5 ? 'border-red-500 border-2' : totalAlerts > 0 ? 'border-yellow-500 border-2' : 'border-green-500'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className={`h-5 w-5 ${totalAlerts > 5 ? 'text-red-500' : totalAlerts > 0 ? 'text-yellow-500' : 'text-green-500'}`} />
            Overall Status
          </CardTitle>
          <CardDescription>
            {totalAlerts === 0 ? 'All administrative tasks are on track' : `${totalAlerts} critical alert${totalAlerts > 1 ? 's' : ''} require attention`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            {totalAlerts === 0 ? (
              <span className="text-green-500">All Clear</span>
            ) : (
              <span className={totalAlerts > 5 ? 'text-red-500' : 'text-yellow-600'}>
                {totalAlerts} Alert{totalAlerts > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{timelinessData.pendingHoursUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Users with unsubmitted hours
            </p>
            {timelinessData.pendingHoursUsers > 0 && (
              <Badge variant="destructive" className="mt-2">Action Required</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unsigned Contracts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{timelinessData.unsignedContracts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Contracts awaiting signature
            </p>
            {timelinessData.unsignedContracts > 0 && (
              <Badge variant="destructive" className="mt-2">Follow Up</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{timelinessData.overdueInvoices}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Invoices past due date
            </p>
            {timelinessData.overdueInvoices > 0 && (
              <Badge variant="destructive" className="mt-2">Urgent</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Section */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Timeliness Analysis</CardTitle>
          <CardDescription>
            User-by-user breakdown and automated reminders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Coming Soon
            </Badge>
            <p className="text-muted-foreground mt-4">
              Phase 4 implementation: User tables with action buttons, automated reminder emails,
              escalation workflows, and historical tracking
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
