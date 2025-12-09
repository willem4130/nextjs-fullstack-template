'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ShieldAlert, AlertCircle, AlertTriangle, TrendingUp } from 'lucide-react'
import { api } from '@/trpc/react'
import Link from 'next/link'

export default function ErrorsPage() {
  const { data: overview, isLoading } = api.dashboard.getOverview.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Error Monitoring</h1>
            <p className="text-muted-foreground">Loading error data...</p>
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
            <h1 className="text-3xl font-bold tracking-tight">Error Monitoring</h1>
            <p className="text-muted-foreground text-red-500">Failed to load error data</p>
          </div>
        </div>
      </div>
    )
  }

  const errorData = overview.errors || {
    critical: 0,
    high: 0,
    errorRate: 0,
  }

  const totalActiveErrors = errorData.critical + errorData.high
  const isHealthy = totalActiveErrors === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/dashboard">
          <ArrowLeft className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Error Monitoring</h1>
          <p className="text-muted-foreground">
            System health monitoring and exception management
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <Card className={errorData.critical > 0 ? 'border-red-500 border-2' : errorData.high > 0 ? 'border-yellow-500 border-2' : 'border-green-500'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className={`h-5 w-5 ${errorData.critical > 0 ? 'text-red-500' : errorData.high > 0 ? 'text-yellow-500' : 'text-green-500'}`} />
            System Health Status
          </CardTitle>
          <CardDescription>
            {isHealthy ? 'All systems operating normally' : 'Issues detected requiring attention'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            {isHealthy ? (
              <span className="text-green-500">Healthy</span>
            ) : (
              <span className={errorData.critical > 0 ? 'text-red-500' : 'text-yellow-600'}>
                {totalActiveErrors} Active Error{totalActiveErrors > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{errorData.critical}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Require immediate attention
            </p>
            {errorData.critical > 0 && (
              <Badge variant="destructive" className="mt-2">Urgent</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{errorData.high}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Should be addressed soon
            </p>
            {errorData.high > 0 && (
              <Badge variant="outline" className="mt-2 border-yellow-600 text-yellow-600">Review</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate (24h)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{errorData.errorRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Percentage of workflows failing
            </p>
            {errorData.errorRate > 10 && (
              <Badge variant="destructive" className="mt-2">High Rate</Badge>
            )}
            {errorData.errorRate <= 10 && errorData.errorRate > 5 && (
              <Badge variant="outline" className="mt-2 border-yellow-600 text-yellow-600">Elevated</Badge>
            )}
            {errorData.errorRate <= 5 && (
              <Badge variant="outline" className="mt-2 border-green-600 text-green-600">Normal</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Section */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Error Management</CardTitle>
          <CardDescription>
            Error logs, resolution workflow, and retry management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Coming Soon
            </Badge>
            <p className="text-muted-foreground mt-4">
              Phase 5 implementation: Error log table with filtering, acknowledge/dismiss/resolve actions,
              retry failed workflows, error analytics, and automated email alerts
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
