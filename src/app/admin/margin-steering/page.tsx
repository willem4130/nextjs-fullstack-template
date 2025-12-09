'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { api } from '@/trpc/react'
import Link from 'next/link'

export default function MarginSteeringPage() {
  const { data: overview, isLoading } = api.dashboard.getOverview.useQuery()
  const { data: projectMargins, isLoading: isLoadingProjects } = api.margin.getProjectMargins.useQuery({
    sort: 'margin-asc',
    status: 'ACTIVE',
  })

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

      {/* Project Margin Table */}
      <Card>
        <CardHeader>
          <CardTitle>Project Margin Breakdown</CardTitle>
          <CardDescription>
            Sorted by margin (lowest first) - Focus on critical and at-risk projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProjects && (
            <div className="text-center py-8 text-muted-foreground">
              Loading project margins...
            </div>
          )}
          {!isLoadingProjects && (!projectMargins || projectMargins.projects.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              No projects with hours data found
            </div>
          )}
          {!isLoadingProjects && projectMargins && projectMargins.projects.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Project</th>
                    <th className="text-left py-3 px-4">Client</th>
                    <th className="text-right py-3 px-4">Hours</th>
                    <th className="text-right py-3 px-4">Revenue</th>
                    <th className="text-right py-3 px-4">Cost</th>
                    <th className="text-right py-3 px-4">Margin</th>
                    <th className="text-right py-3 px-4">Margin %</th>
                    <th className="text-center py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projectMargins.projects.map((project) => (
                    <tr
                      key={project.id}
                      className={`border-b hover:bg-muted/50 ${
                        project.severity === 'critical' ? 'bg-red-50' :
                        project.severity === 'warning' ? 'bg-yellow-50' :
                        ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <Link href={`/admin/projects/${project.id}`} className="font-medium hover:underline">
                          {project.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {project.clientName || '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-sm">
                        {project.totalHours.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        ${project.revenue.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        ${project.cost.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        ${project.margin.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold ${
                          project.severity === 'critical' ? 'text-red-600' :
                          project.severity === 'warning' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {project.marginPercentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            project.severity === 'critical' ? 'destructive' :
                            project.severity === 'warning' ? 'outline' :
                            'default'
                          }
                          className={
                            project.severity === 'warning' ? 'border-yellow-600 text-yellow-600' : ''
                          }
                        >
                          {project.severity === 'critical' ? 'Critical' :
                           project.severity === 'warning' ? 'At Risk' :
                           'Healthy'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
