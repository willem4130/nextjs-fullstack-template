'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/trpc/react'
import Link from 'next/link'
import { useState } from 'react'
import { FileText, Clock, DollarSign, ChevronRight } from 'lucide-react'

export default function ProjectsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = api.projects.getAll.useQuery({ page, limit: 10 })
  const { data: stats } = api.projects.getStats.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-muted-foreground">
          Manage and monitor all your Simplicate projects
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.projects.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.projects.active} active • {stats.projects.completed} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.hours.total.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.hours.approved.toFixed(1)} approved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contract Sign Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((stats.contracts.signed / stats.contracts.total) * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.contracts.signed}/{stats.contracts.total} signed
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Projects List */}
      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <CardDescription>
            {data?.pagination.total ?? 0} projects total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.projects.map((project) => {
              const totalHours = project.hoursEntries.reduce((sum, entry) => sum + entry.hours, 0)
              const totalInvoiced = project.invoices.reduce((sum, inv) => sum + inv.amount, 0)
              const signedContracts = project.contracts.filter(c => c.status === 'SIGNED').length

              return (
                <Link key={project.id} href={`/admin/projects/${project.id}`}>
                  <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{project.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {project.clientName || 'No client'} • {project.projectNumber || 'No project number'}
                          </p>
                        </div>
                        <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {project.status}
                        </Badge>
                      </div>

                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {signedContracts}/{project._count.contracts} contracts signed
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {totalHours.toFixed(1)} hours
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            ${totalInvoiced.toLocaleString()} invoiced
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          {project._count.automationLogs} automation runs
                        </Badge>
                        {project.startDate && (
                          <Badge variant="outline" className="text-xs">
                            Started {new Date(project.startDate).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Link>
              )
            })}

            {data?.projects.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No projects found. Create your first project in Simplicate!
              </p>
            )}
          </div>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= data.pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
