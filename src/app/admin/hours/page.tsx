'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Clock,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Building2,
  FolderOpen,
  Users,
  Calendar,
  ArrowUpDown,
  TrendingUp,
} from 'lucide-react'
import { api } from '@/trpc/react'
import { useState } from 'react'

// Generate month options for the last 12 months
function getMonthOptions() {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('nl-NL', { year: 'numeric', month: 'long' })
    options.push({ value, label })
  }
  return options
}

const monthOptions = getMonthOptions()

function getBudgetStatus(percentage: number | null) {
  if (percentage === null) return { label: 'No budget', variant: 'secondary' as const, color: 'text-muted-foreground' }
  if (percentage >= 100) return { label: 'Over budget', variant: 'destructive' as const, color: 'text-red-600' }
  if (percentage >= 90) return { label: 'At risk', variant: 'default' as const, color: 'text-orange-600' }
  if (percentage >= 75) return { label: 'High usage', variant: 'outline' as const, color: 'text-yellow-600' }
  return { label: 'On track', variant: 'outline' as const, color: 'text-green-600' }
}

export default function HoursPage() {
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || '')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [employeeFilter, setEmployeeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'client' | 'project' | 'hours' | 'budget'>('client')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  const { data: projectsSummary, isLoading } = api.hours.getProjectsSummary.useQuery({
    month: selectedMonth,
    projectId: projectFilter !== 'all' ? projectFilter : undefined,
    employeeId: employeeFilter !== 'all' ? employeeFilter : undefined,
    sortBy,
    sortOrder,
  })

  const { data: projects } = api.hours.getProjectsForFilter.useQuery()
  const { data: employees } = api.hours.getEmployeesForFilter.useQuery()
  const { data: monthlyTotals } = api.hours.getMonthlyTotals.useQuery({ months: 6 })

  const syncHours = api.sync.syncHours.useMutation()
  const syncServices = api.sync.syncServices.useMutation()
  const utils = api.useUtils()

  const handleSyncAll = async () => {
    try {
      await syncServices.mutateAsync()
      await syncHours.mutateAsync()
      utils.hours.invalidate()
    } catch (error) {
      console.error('Failed to sync:', error)
    }
  }

  const isSyncing = syncHours.isPending || syncServices.isPending

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  const currentMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hours Overview</h1>
          <p className="text-muted-foreground">Hours by project, dienst and employee per month</p>
        </div>
        <Button onClick={handleSyncAll} disabled={isSyncing}>
          {isSyncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync All
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {/* Month selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[200px]">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Project</label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[220px]">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects?.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.clientName ? `${p.clientName} - ${p.name}` : p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Employee</label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-[180px]">
                  <Users className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {employees?.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name || e.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort by */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Sort by</label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[150px]">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="budget">Budget %</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort order */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Order</label>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as typeof sortOrder)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours in {currentMonthLabel}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectsSummary?.totals.hoursThisMonth.toFixed(1) || '0'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Entries</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectsSummary?.totals.entriesThisMonth || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectsSummary?.totals.projectsWithHours || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 6 Months</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthlyTotals?.reduce((sum, m) => sum + m.hours, 0).toFixed(0) || '0'}h
            </div>
            <p className="text-xs text-muted-foreground">
              {monthlyTotals?.reduce((sum, m) => sum + m.entries, 0) || 0} entries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <Card>
        <CardHeader>
          <CardTitle>Projects - {currentMonthLabel}</CardTitle>
          <CardDescription>
            Hours breakdown per project, dienst, and employee
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !projectsSummary?.projects.length ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No hours found</h3>
              <p className="text-muted-foreground">
                No hours logged for {currentMonthLabel}
                {projectFilter !== 'all' && ' in selected project'}
                {employeeFilter !== 'all' && ' by selected employee'}
              </p>
              <Button variant="outline" className="mt-4" onClick={handleSyncAll} disabled={isSyncing}>
                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sync Hours
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {projectsSummary.projects.map((project) => (
                <Collapsible
                  key={project.id}
                  open={expandedProjects.has(project.id)}
                  onOpenChange={() => toggleProject(project.id)}
                >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          {expandedProjects.has(project.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{project.clientName || 'No client'}</span>
                              <span className="text-muted-foreground">-</span>
                              <span>{project.name}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {project.services.length} dienst{project.services.length !== 1 ? 'en' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold">{project.totalHoursThisMonth.toFixed(1)}h</p>
                            <p className="text-xs text-muted-foreground">this month</p>
                          </div>
                          {/* Show worst budget status */}
                          {(() => {
                            const maxBudget = Math.max(...project.services.map(s => s.budgetPercentage || 0))
                            const status = getBudgetStatus(maxBudget > 0 ? maxBudget : null)
                            return maxBudget > 0 ? (
                              <Badge variant={status.variant} className="min-w-[90px] justify-center">
                                {maxBudget}%
                              </Badge>
                            ) : null
                          })()}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t bg-muted/30">
                        {project.services.map((service) => {
                          const status = getBudgetStatus(service.budgetPercentage)
                          return (
                            <div key={service.id} className="border-b last:border-b-0 p-4">
                              {/* Service header */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{service.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm">
                                    <span className="font-medium">{service.hoursThisMonth.toFixed(1)}h</span>
                                    <span className="text-muted-foreground"> this month</span>
                                  </span>
                                  <Badge variant={status.variant}>{status.label}</Badge>
                                </div>
                              </div>

                              {/* Budget progress */}
                              {service.budgetHours && service.budgetHours > 0 && (
                                <div className="mb-4 space-y-1.5">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                      Budget: {service.usedHours.toFixed(1)} / {service.budgetHours}h used
                                    </span>
                                    <span className={status.color}>{service.budgetPercentage}%</span>
                                  </div>
                                  <Progress
                                    value={Math.min(service.budgetPercentage || 0, 100)}
                                    className="h-2"
                                  />
                                  {service.monthPercentageOfBudget !== null && (
                                    <p className="text-xs text-muted-foreground">
                                      This month: {service.monthPercentageOfBudget}% of total budget
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Employee breakdown */}
                              {service.employees.length > 0 && (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Employee</TableHead>
                                      <TableHead className="text-right">Hours</TableHead>
                                      <TableHead className="text-right">Entries</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {service.employees.map((emp) => (
                                      <TableRow key={emp.employee.id}>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            <span>{emp.employee.name || emp.employee.email}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                          {emp.hoursThisMonth.toFixed(1)}h
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                          {emp.entries}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
