'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { api } from '@/trpc/react'
import Link from 'next/link'

export default function MarginSteeringPage() {
  const { data: overview, isLoading } = api.dashboard.getOverview.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Margin Steering</h1>
            <p className="text-muted-foreground">Loading margin analysis...</p>
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
            <h1 className="text-3xl font-bold tracking-tight">Margin Steering</h1>
            <p className="text-muted-foreground text-red-500">Failed to load margin data</p>
          </div>
        </div>
      </div>
    )
  }

  const marginData = overview.margin || {
    overallMargin: 0,
    marginTrend: 'neutral' as const,
    criticalProjects: 0,
    atRiskRevenue: 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/dashboard">
          <ArrowLeft className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Margin Steering</h1>
          <p className="text-muted-foreground">
            Real-time profitability monitoring and project margin analysis
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Margin</CardTitle>
            {marginData.marginTrend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : marginData.marginTrend === 'down' ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{marginData.overallMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: 40% | Warning: 25% | Critical: 15%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Projects</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{marginData.criticalProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Projects with margin below 15%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At-Risk Revenue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              ${marginData.atRiskRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue from projects at 15-25% margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Section */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Margin Analysis</CardTitle>
          <CardDescription>
            Project-by-project margin breakdown and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Coming Soon
            </Badge>
            <p className="text-muted-foreground mt-4">
              Phase 3 implementation: Project margin table, employee profitability analysis,
              margin trend charts, and automated alerts
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
