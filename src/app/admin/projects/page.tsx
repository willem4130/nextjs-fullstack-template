'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/trpc/react'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import {
  FileText,
  Clock,
  DollarSign,
  ChevronRight,
  Search,
  Building2,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  XCircle,
  LayoutGrid,
  List,
  Filter,
  Car,
} from 'lucide-react'

type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'

const statusConfig: Record<ProjectStatus, { icon: React.ElementType; color: string; bgColor: string }> = {
  ACTIVE: { icon: PlayCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  COMPLETED: { icon: CheckCircle2, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  ON_HOLD: { icon: PauseCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  CANCELLED: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
}

export default function ProjectsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  const { data, isLoading } = api.projects.getAll.useQuery({
    page,
    limit: 20,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  })
  const { data: stats } = api.projects.getStats.useQuery()

  // Client-side filtering for search
  const filteredProjects = useMemo(() => {
    if (!data?.projects) return []
    if (!searchQuery.trim()) return data.projects

    const query = searchQuery.toLowerCase()
    return data.projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.clientName?.toLowerCase().includes(query) ||
        project.projectNumber?.toLowerCase().includes(query)
    )
  }, [data?.projects, searchQuery])

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const contractSignRate = stats?.contracts.total
    ? ((stats.contracts.signed / stats.contracts.total) * 100).toFixed(0)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage and monitor all your Simplicate projects
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.projects.total}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  <PlayCircle className="h-3 w-3 mr-1" />
                  {stats.projects.active} active
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {stats.projects.completed} completed
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.hours.total.toFixed(1)}h</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Approved</span>
                  <span>{stats.hours.approved.toFixed(1)}h</span>
                </div>
                <Progress
                  value={stats.hours.total > 0 ? (stats.hours.approved / stats.hours.total) * 100 : 0}
                  className="h-1.5"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contract Sign Rate</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contractSignRate}%</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {stats.contracts.signed}/{stats.contracts.total} signed
                  </span>
                </div>
                <Progress value={Number(contractSignRate)} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invoices</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.invoices.total}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-green-100 text-green-700 text-xs">
                  {stats.invoices.paid} paid
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {stats.invoices.pending} pending
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mileage</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.mileage.totalKilometers.toFixed(0)} km</div>
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">
                  €{stats.mileage.totalCost.toFixed(2)} total cost
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 gap-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects, clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as ProjectStatus | 'ALL')
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Projects</CardTitle>
              <CardDescription>
                {filteredProjects.length} of {data?.pagination.total ?? 0} projects
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'cards' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => {
                const totalHours = project.hoursEntries.reduce((sum, entry) => sum + entry.hours, 0)
                const totalInvoiced = project.invoices.reduce((sum, inv) => sum + inv.amount, 0)
                const signedContracts = project.contracts.filter((c) => c.status === 'SIGNED').length
                const StatusIcon = statusConfig[project.status].icon

                return (
                  <Link key={project.id} href={`/admin/projects/${project.id}`}>
                    <Card className="hover:shadow-md transition-all cursor-pointer h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1 min-w-0">
                            <CardTitle className="text-base truncate">{project.name}</CardTitle>
                            <CardDescription className="flex items-center gap-1 truncate">
                              <Building2 className="h-3 w-3 flex-shrink-0" />
                              {project.clientName || 'No client'}
                            </CardDescription>
                          </div>
                          <Badge
                            variant="outline"
                            className={`${statusConfig[project.status].bgColor} ${statusConfig[project.status].color} border-0 flex-shrink-0`}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {project.status.toLowerCase()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {project.projectNumber && (
                          <p className="text-xs text-muted-foreground font-mono">
                            #{project.projectNumber}
                          </p>
                        )}

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="space-y-1">
                            <p className="text-lg font-semibold">{totalHours.toFixed(0)}</p>
                            <p className="text-xs text-muted-foreground">Hours</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-lg font-semibold">
                              {signedContracts}/{project._count.contracts}
                            </p>
                            <p className="text-xs text-muted-foreground">Contracts</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-lg font-semibold">{project._count.invoices}</p>
                            <p className="text-xs text-muted-foreground">Invoices</p>
                          </div>
                        </div>

                        {project.startDate && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            Started {new Date(project.startDate).toLocaleDateString()}
                            {project.endDate && (
                              <span> - {new Date(project.endDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Contracts</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => {
                    const totalHours = project.hoursEntries.reduce((sum, entry) => sum + entry.hours, 0)
                    const signedContracts = project.contracts.filter((c) => c.status === 'SIGNED').length
                    const StatusIcon = statusConfig[project.status].icon

                    return (
                      <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <p className="font-medium">{project.name}</p>
                            {project.projectNumber && (
                              <p className="text-xs text-muted-foreground font-mono">
                                #{project.projectNumber}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {project.clientName || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${statusConfig[project.status].bgColor} ${statusConfig[project.status].color} border-0`}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {project.status.toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {totalHours.toFixed(1)}h
                        </TableCell>
                        <TableCell className="text-right">
                          {signedContracts}/{project._count.contracts}
                        </TableCell>
                        <TableCell className="text-right">{project._count.invoices}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {project.startDate
                            ? new Date(project.startDate).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Link href={`/admin/projects/${project.id}`}>
                            <Button variant="ghost" size="icon">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No projects found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'Sync from Simplicate to import your projects'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
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
