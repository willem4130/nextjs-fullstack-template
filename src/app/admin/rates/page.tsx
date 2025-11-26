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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Users, FolderKanban, Layers, DollarSign } from 'lucide-react'
import { api } from '@/trpc/react'

export default function RatesPage() {
  const { data, isLoading } = api.rates.getRateOverview.useQuery()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const { userRates = [], projectRates = [], serviceRates = [], stats } = data ?? {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rates</h1>
        <p className="text-muted-foreground">
          Manage rates at user, project, and service levels
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Rates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.usersWithRates ?? 0}</div>
            <p className="text-xs text-muted-foreground">Users with default rates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Overrides</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.projectOverrides ?? 0}</div>
            <p className="text-xs text-muted-foreground">Project-specific rates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Overrides</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.serviceOverrides ?? 0}</div>
            <p className="text-xs text-muted-foreground">Service-employee rates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Hierarchy</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium text-muted-foreground">
              Service &gt; Project &gt; User
            </div>
            <p className="text-xs text-muted-foreground">Most specific wins</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different levels */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Rates ({userRates.length})</TabsTrigger>
          <TabsTrigger value="projects">Project Rates ({projectRates.length})</TabsTrigger>
          <TabsTrigger value="services">Service Rates ({serviceRates.length})</TabsTrigger>
        </TabsList>

        {/* User Rates Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Default Rates</CardTitle>
              <CardDescription>
                Base rates synced from Simplicate. These apply when no project/service override exists.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userRates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users with rates found. Run &quot;Sync Employees&quot; from Settings.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Sales Rate</TableHead>
                      <TableHead className="text-right">Cost Rate</TableHead>
                      <TableHead>Last Synced</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRates.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.name ?? 'Unnamed'}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.simplicateEmployeeType ? (
                            <Badge variant="secondary">{user.simplicateEmployeeType}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {user.salesRateOverride ?? user.defaultSalesRate ? (
                            <div className="flex flex-col items-end">
                              <span className="font-medium">
                                {'\u20AC'}{(user.salesRateOverride ?? user.defaultSalesRate)?.toFixed(2)}
                              </span>
                              {user.salesRateOverride && (
                                <Badge variant="outline" className="text-xs">override</Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {user.costRateOverride ?? user.defaultCostRate ? (
                            <div className="flex flex-col items-end">
                              <span className="font-medium">
                                {'\u20AC'}{(user.costRateOverride ?? user.defaultCostRate)?.toFixed(2)}
                              </span>
                              {user.costRateOverride && (
                                <Badge variant="outline" className="text-xs">override</Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {user.ratesSyncedAt
                            ? new Date(user.ratesSyncedAt).toLocaleDateString()
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project Rates Tab */}
        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>Project-Level Rate Overrides</CardTitle>
              <CardDescription>
                Rates specific to a project-employee combination. These override user defaults.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projectRates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No project-level rate overrides found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Sales Rate</TableHead>
                      <TableHead className="text-right">Cost Rate</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectRates.map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{rate.project.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {rate.project.projectNumber}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p>{rate.user.name ?? rate.user.email}</p>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {rate.salesRate ? `\u20AC${rate.salesRate.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {rate.costRate ? `\u20AC${rate.costRate.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {rate.salesRateSource ?? 'manual'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Rates Tab */}
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Service-Employee Rate Overrides</CardTitle>
              <CardDescription>
                Most specific rates: per service (dienst) and employee. These override everything else.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {serviceRates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No service-level rate overrides found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project / Service</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Sales Rate</TableHead>
                      <TableHead className="text-right">Cost Rate</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceRates.map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{rate.projectService.project.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {rate.projectService.name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p>{rate.user.name ?? rate.user.email}</p>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {rate.salesRate ? `\u20AC${rate.salesRate.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {rate.costRate ? `\u20AC${rate.costRate.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {rate.salesRateSource ?? 'manual'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
