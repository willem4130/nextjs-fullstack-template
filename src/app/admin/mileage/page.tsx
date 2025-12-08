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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Car,
  Loader2,
  Building2,
  Users,
  Calendar,
  ArrowUpDown,
  TrendingUp,
  MapPin,
} from 'lucide-react'
import { api } from '@/trpc/react'
import { useState, useEffect } from 'react'
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select'

// Generate month options for the last 12 months
function getMonthOptions(): MultiSelectOption[] {
  const options: MultiSelectOption[] = []
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

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Format number with thousand separators
function formatNumber(num: number): string {
  return new Intl.NumberFormat('nl-NL').format(num)
}

// Types for filter state
interface FilterState {
  months: string[]
  projects: string[]
  employees: string[]
  sortBy: 'kilometers' | 'cost' | 'trips' | 'name'
  sortOrder: 'asc' | 'desc'
}

const defaultFilters: FilterState = {
  months: [monthOptions[0]?.value || ''],
  projects: [],
  employees: [],
  sortBy: 'kilometers',
  sortOrder: 'desc',
}

export default function MileagePage() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [activeTab, setActiveTab] = useState<'overview' | 'byProject' | 'byEmployee' | 'entries'>(
    'overview'
  )

  // Calculate date range from selected months
  const dateRange =
    filters.months.length > 0
      ? filters.months.reduce(
          (acc, month) => {
            const [year, monthNum] = month.split('-').map(Number)
            const start = new Date(year!, monthNum! - 1, 1)
            const end = new Date(year!, monthNum!, 0, 23, 59, 59)
            return {
              start: acc.start ? (start < acc.start ? start : acc.start) : start,
              end: acc.end ? (end > acc.end ? end : acc.end) : end,
            }
          },
          { start: null as Date | null, end: null as Date | null }
        )
      : null

  // Fetch data based on active tab
  const { data: overview, isLoading: overviewLoading } = api.mileage.getOverview.useQuery(
    {
      startDate: dateRange?.start?.toISOString(),
      endDate: dateRange?.end?.toISOString(),
      projectId: filters.projects.length === 1 ? filters.projects[0] : undefined,
      employeeId: filters.employees.length === 1 ? filters.employees[0] : undefined,
    },
    { enabled: activeTab === 'overview' }
  )

  const { data: byProject, isLoading: byProjectLoading } = api.mileage.getByProject.useQuery(
    {
      startDate: dateRange?.start?.toISOString(),
      endDate: dateRange?.end?.toISOString(),
    },
    { enabled: activeTab === 'byProject' }
  )

  const { data: byEmployee, isLoading: byEmployeeLoading } = api.mileage.getByEmployee.useQuery(
    {
      startDate: dateRange?.start?.toISOString(),
      endDate: dateRange?.end?.toISOString(),
    },
    { enabled: activeTab === 'byEmployee' }
  )

  const { data: entriesData, isLoading: entriesLoading } = api.mileage.getEntries.useQuery(
    {
      startDate: dateRange?.start?.toISOString(),
      endDate: dateRange?.end?.toISOString(),
      projectId: filters.projects.length === 1 ? filters.projects[0] : undefined,
      employeeId: filters.employees.length === 1 ? filters.employees[0] : undefined,
      limit: 100,
      offset: 0,
    },
    { enabled: activeTab === 'entries' }
  )

  // Fetch filter options
  const { data: projectsData } = api.hours.getProjectsForFilter.useQuery()
  const { data: employeesData } = api.hours.getEmployeesForFilter.useQuery()

  // Convert to MultiSelectOptions
  const projectOptions: MultiSelectOption[] =
    projectsData?.map((p) => ({
      value: p.id,
      label: `${p.clientName ? `${p.clientName} - ` : ''}${p.name}`,
    })) || []

  const employeeOptions: MultiSelectOption[] =
    employeesData?.map((e) => ({
      value: e.id,
      label: e.name ?? 'Unknown',
    })) || []

  // Sort data based on filters
  const sortedByProject = byProject
    ? [...byProject].sort((a, b) => {
        let comparison = 0
        switch (filters.sortBy) {
          case 'kilometers':
            comparison = a.totalKilometers - b.totalKilometers
            break
          case 'cost':
            comparison = a.totalCost - b.totalCost
            break
          case 'trips':
            comparison = a.trips - b.trips
            break
          case 'name':
            comparison = a.projectName.localeCompare(b.projectName)
            break
        }
        return filters.sortOrder === 'asc' ? comparison : -comparison
      })
    : []

  const sortedByEmployee = byEmployee
    ? [...byEmployee].sort((a, b) => {
        let comparison = 0
        switch (filters.sortBy) {
          case 'kilometers':
            comparison = a.totalKilometers - b.totalKilometers
            break
          case 'cost':
            comparison = a.totalCost - b.totalCost
            break
          case 'trips':
            comparison = a.trips - b.trips
            break
          case 'name':
            comparison = a.employeeName.localeCompare(b.employeeName)
            break
        }
        return filters.sortOrder === 'asc' ? comparison : -comparison
      })
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mileage Tracking</h1>
        <p className="text-muted-foreground">
          Track kilometers traveled and associated costs
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Month Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                <Calendar className="mr-2 inline h-4 w-4" />
                Period
              </label>
              <MultiSelect
                options={monthOptions}
                selected={filters.months}
                onChange={(months) => setFilters({ ...filters, months })}
                placeholder="Select months..."
              />
            </div>

            {/* Project Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                <Building2 className="mr-2 inline h-4 w-4" />
                Projects
              </label>
              <MultiSelect
                options={projectOptions}
                selected={filters.projects}
                onChange={(projects) => setFilters({ ...filters, projects })}
                placeholder="All projects"
              />
            </div>

            {/* Employee Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                <Users className="mr-2 inline h-4 w-4" />
                Employees
              </label>
              <MultiSelect
                options={employeeOptions}
                selected={filters.employees}
                onChange={(employees) => setFilters({ ...filters, employees })}
                placeholder="All employees"
              />
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                <ArrowUpDown className="mr-2 inline h-4 w-4" />
                Sort By
              </label>
              <div className="flex gap-2">
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) =>
                    setFilters({ ...filters, sortBy: value as FilterState['sortBy'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kilometers">Kilometers</SelectItem>
                    <SelectItem value="cost">Cost</SelectItem>
                    <SelectItem value="trips">Trips</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
                    })
                  }
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setFilters(defaultFilters)}
              size="sm"
            >
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="byProject">By Project</TabsTrigger>
          <TabsTrigger value="byEmployee">By Employee</TabsTrigger>
          <TabsTrigger value="entries">Detailed Entries</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {overviewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : overview ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Kilometers</CardTitle>
                  <Car className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(overview.totalKilometers)}</div>
                  <p className="text-xs text-muted-foreground">{overview.totalTrips} trips</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(overview.totalCost)}</div>
                  <p className="text-xs text-muted-foreground">
                    {overview.totalKilometers > 0
                      ? `€${(overview.totalCost / overview.totalKilometers).toFixed(2)} per km`
                      : 'No data'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average per Trip</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overview.totalTrips > 0
                      ? formatNumber(Math.round(overview.totalKilometers / overview.totalTrips))
                      : '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">km per trip</p>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>

        {/* By Project Tab */}
        <TabsContent value="byProject" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mileage by Project</CardTitle>
              <CardDescription>Kilometers and costs grouped by project</CardDescription>
            </CardHeader>
            <CardContent>
              {byProjectLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : sortedByProject.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Kilometers</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Trips</TableHead>
                      <TableHead className="text-right">Avg/Trip</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedByProject.map((project) => (
                      <TableRow key={project.projectId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{project.projectName}</div>
                            <div className="text-sm text-muted-foreground">
                              {project.projectNumber}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(project.totalKilometers)} km
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(project.totalCost)}
                        </TableCell>
                        <TableCell className="text-right">{project.trips}</TableCell>
                        <TableCell className="text-right">
                          {project.trips > 0
                            ? formatNumber(Math.round(project.totalKilometers / project.trips))
                            : '0'}{' '}
                          km
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No mileage data found for selected filters
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Employee Tab */}
        <TabsContent value="byEmployee" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mileage by Employee</CardTitle>
              <CardDescription>Kilometers and costs grouped by employee</CardDescription>
            </CardHeader>
            <CardContent>
              {byEmployeeLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : sortedByEmployee.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Kilometers</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Trips</TableHead>
                      <TableHead className="text-right">Avg/Trip</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedByEmployee.map((employee) => (
                      <TableRow key={employee.employeeId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee.employeeName}</div>
                            <div className="text-sm text-muted-foreground">
                              {employee.employeeEmail}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(employee.totalKilometers)} km
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(employee.totalCost)}
                        </TableCell>
                        <TableCell className="text-right">{employee.trips}</TableCell>
                        <TableCell className="text-right">
                          {employee.trips > 0
                            ? formatNumber(Math.round(employee.totalKilometers / employee.trips))
                            : '0'}{' '}
                          km
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No mileage data found for selected filters
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed Entries Tab */}
        <TabsContent value="entries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Mileage Entries</CardTitle>
              <CardDescription>Individual mileage records</CardDescription>
            </CardHeader>
            <CardContent>
              {entriesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : entriesData && entriesData.entries.length > 0 ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Kilometers</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entriesData.entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {new Date(entry.date).toLocaleDateString('nl-NL')}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{entry.employee.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {entry.employee.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {entry.project ? (
                              <div>
                                <div className="font-medium">{entry.project.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {entry.project.projectNumber}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No project</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {entry.description || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(entry.kilometers)} km
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(entry.cost)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="text-sm text-muted-foreground">
                    Showing {entriesData.entries.length} of {entriesData.total} entries
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No mileage entries found for selected filters
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
