'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  FileText,
  Clock,
  DollarSign,
  CheckCircle2,
  FolderKanban,
  Activity,
  AlertCircle
} from 'lucide-react'
import { api } from '@/trpc/react'
import Link from 'next/link'

export default function DashboardPage() {
  const { data: overview, isLoading } = api.dashboard.getOverview.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Loading dashboard data...
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-red-500">
            Failed to load dashboard data
          </p>
        </div>
      </div>
    )
  }

  const stats = [
    {
      title: 'Active Projects',
      value: overview.projects.active.toString(),
      subtitle: `${overview.projects.total} total`,
      change: overview.projects.completed > 0 ? `${overview.projects.completed} completed` : 'No completed projects',
      trend: 'neutral' as const,
      icon: FolderKanban,
      href: '/admin/projects',
    },
    {
      title: 'Contract Sign Rate',
      value: `${overview.contracts.signRate.toFixed(1)}%`,
      subtitle: `${overview.contracts.signed}/${overview.contracts.total} signed`,
      change: `${overview.contracts.pending} pending`,
      trend: overview.contracts.signRate > 70 ? 'up' : 'down' as const,
      icon: FileText,
      href: '/admin/contracts',
    },
    {
      title: 'Total Hours',
      value: overview.hours.total.toFixed(1),
      subtitle: `${overview.hours.approved.toFixed(1)} hrs approved`,
      change: `${(overview.hours.total - overview.hours.approved).toFixed(1)} hrs pending`,
      trend: 'neutral' as const,
      icon: Clock,
      href: '/admin/hours',
    },
    {
      title: 'Total Revenue',
      value: `$${overview.invoices.totalAmount.toLocaleString()}`,
      subtitle: `${overview.invoices.paid} invoices paid`,
      change: `${overview.invoices.pending} pending`,
      trend: overview.invoices.paid > overview.invoices.pending ? 'up' : 'neutral' as const,
      icon: DollarSign,
      href: '/admin/invoices',
    },
  ]

  const automationStats = [
    {
      label: 'Total Runs',
      value: overview.automation.total,
      color: 'text-blue-600',
    },
    {
      label: 'Successful',
      value: overview.automation.success,
      color: 'text-green-600',
    },
    {
      label: 'Failed',
      value: overview.automation.failed,
      color: 'text-red-600',
    },
    {
      label: 'Success Rate',
      value: `${overview.automation.successRate.toFixed(1)}%`,
      color: 'text-purple-600',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Simplicate Automation Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your project automation system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                  <div className="flex items-center text-xs text-muted-foreground mt-2">
                    {stat.trend === 'up' ? (
                      <ArrowUpIcon className="mr-1 h-3 w-3 text-green-500" />
                    ) : stat.trend === 'down' ? (
                      <ArrowDownIcon className="mr-1 h-3 w-3 text-red-500" />
                    ) : (
                      <Activity className="mr-1 h-3 w-3 text-blue-500" />
                    )}
                    <span>{stat.change}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Automation & Projects */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Automation Performance */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Automation Performance</CardTitle>
            <CardDescription>System automation execution statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {automationStats.map((stat) => (
                <div key={stat.label} className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <Link href="/admin/automation" className="text-sm text-blue-600 hover:underline">
                View detailed automation logs →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Latest active projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overview.projects.recent.map((project) => (
                <Link key={project.id} href={`/admin/projects/${project.id}`}>
                  <div className="flex items-start hover:bg-muted/50 p-2 rounded-lg transition-colors cursor-pointer">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.clientName || 'No client'}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {project._count.contracts} contracts
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {project._count.hoursEntries} hours
                        </Badge>
                      </div>
                    </div>
                    <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {project.status}
                    </Badge>
                  </div>
                </Link>
              ))}
              {overview.projects.recent.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent projects
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Automation Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Automation Activity</CardTitle>
          <CardDescription>Latest workflow executions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {overview.automation.recent.map((log) => {
              const isSuccess = log.status === 'SUCCESS'
              const isFailed = log.status === 'FAILED'
              const isRunning = log.status === 'RUNNING'

              return (
                <div key={log.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  {isSuccess && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  {isFailed && <AlertCircle className="h-5 w-5 text-red-500" />}
                  {isRunning && <Activity className="h-5 w-5 text-blue-500 animate-pulse" />}

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {log.workflowType.replace(/_/g, ' ')}
                      </p>
                      <Badge
                        variant={isSuccess ? 'default' : isFailed ? 'destructive' : 'secondary'}
                      >
                        {log.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.project?.name || 'System-wide workflow'} •
                      {new Date(log.startedAt).toLocaleString()}
                    </p>
                    {log.error && (
                      <p className="text-xs text-red-500 mt-1">{log.error}</p>
                    )}
                  </div>

                  {log.completedAt && (
                    <div className="text-xs text-muted-foreground">
                      {Math.round((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)}s
                    </div>
                  )}
                </div>
              )
            })}
            {overview.automation.recent.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent automation activity
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
