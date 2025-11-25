'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/trpc/react'
import { useState } from 'react'
import { CheckCircle2, XCircle, Clock, AlertCircle, Activity, ListTodo, Play, RefreshCw } from 'lucide-react'

export default function AutomationPage() {
  const [page, setPage] = useState(1)
  const [queuePage, setQueuePage] = useState(1)
  const { data, isLoading, refetch: refetchLogs } = api.automation.getLogs.useQuery({ page, limit: 20 })
  const { data: stats } = api.automation.getStats.useQuery()
  const { data: queueData, refetch: refetchQueue } = api.automation.getQueue.useQuery({ page: queuePage, limit: 10 })
  const { data: queueStats, refetch: refetchQueueStats } = api.automation.getQueueStats.useQuery()

  const utils = api.useUtils()
  const triggerProcessing = api.automation.processQueueNow.useMutation({
    onSuccess: () => {
      // Refetch queue data after triggering
      void refetchQueue()
      void refetchQueueStats()
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automation Logs</h1>
          <p className="text-muted-foreground">Loading automation data...</p>
        </div>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'RUNNING':
        return <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
      case 'RETRYING':
        return <Clock className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge variant="default" className="bg-green-500">SUCCESS</Badge>
      case 'FAILED':
        return <Badge variant="destructive">FAILED</Badge>
      case 'RUNNING':
        return <Badge variant="default" className="bg-blue-500">RUNNING</Badge>
      case 'RETRYING':
        return <Badge variant="default" className="bg-yellow-500">RETRYING</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getWorkflowColor = (type: string) => {
    switch (type) {
      case 'CONTRACT_DISTRIBUTION':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'HOURS_REMINDER':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'INVOICE_GENERATION':
        return 'bg-green-100 text-green-700 border-green-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getQueueStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">PENDING</Badge>
      case 'PROCESSING':
        return <Badge variant="default" className="bg-blue-500">PROCESSING</Badge>
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-500">COMPLETED</Badge>
      case 'FAILED':
        return <Badge variant="destructive">FAILED</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automation</h1>
          <p className="text-muted-foreground">
            Monitor workflows and queue processing
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void refetchLogs()
            void refetchQueue()
            void refetchQueueStats()
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Queue Stats Banner */}
      {queueStats && queueStats.pending > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ListTodo className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-medium">{queueStats.pending} items pending in queue</p>
                  <p className="text-sm text-muted-foreground">
                    Cron runs every minute to process the queue
                  </p>
                </div>
              </div>
              <Button
                onClick={() => triggerProcessing.mutate()}
                disabled={triggerProcessing.isPending}
              >
                <Play className="h-4 w-4 mr-2" />
                Check Queue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="logs">Execution Logs</TabsTrigger>
          <TabsTrigger value="queue">
            Workflow Queue
            {queueStats && queueStats.pending > 0 && (
              <Badge variant="secondary" className="ml-2">{queueStats.pending}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-6">
          {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                All workflow runs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.successRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.success} successful runs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Running Now</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.running}</div>
              <p className="text-xs text-muted-foreground">
                Active workflows
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Workflow Stats */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Workflows by Type</CardTitle>
            <CardDescription>Execution count per workflow type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Contract Distribution</p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.byWorkflow.contractDistribution}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Hours Reminder</p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats.byWorkflow.hoursReminder}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Invoice Generation</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.byWorkflow.invoiceGeneration}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Execution History</CardTitle>
          <CardDescription>
            {data?.pagination.total ?? 0} total executions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.logs.map((log) => {
              const duration = log.completedAt
                ? Math.round((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)
                : null

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {getStatusIcon(log.status)}

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getWorkflowColor(log.workflowType)}>
                          {log.workflowType.replace(/_/g, ' ')}
                        </Badge>
                        {getStatusBadge(log.status)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {duration !== null && <span>{duration}s</span>}
                        {log.retryCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {log.retryCount} retries
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-sm">
                      {log.project ? (
                        <p className="font-medium">{log.project.name}</p>
                      ) : (
                        <p className="font-medium text-muted-foreground">System-wide execution</p>
                      )}
                      {log.project?.clientName && (
                        <p className="text-xs text-muted-foreground">{log.project.clientName}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Started: {new Date(log.startedAt).toLocaleString()}</span>
                      {log.completedAt && (
                        <span>Completed: {new Date(log.completedAt).toLocaleString()}</span>
                      )}
                    </div>

                    {log.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        <strong>Error:</strong> {log.error}
                      </div>
                    )}

                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View metadata
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )
            })}

            {data?.logs.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No automation logs found. Workflows will appear here once they start running.
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
        </TabsContent>

        {/* Queue Tab */}
        <TabsContent value="queue" className="space-y-6">
          {/* Queue Stats */}
          {queueStats && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{queueStats.pending}</div>
                  <p className="text-xs text-muted-foreground">Waiting to process</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Processing</CardTitle>
                  <Activity className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{queueStats.processing}</div>
                  <p className="text-xs text-muted-foreground">Currently running</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{queueStats.completed}</div>
                  <p className="text-xs text-muted-foreground">Successfully processed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed</CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{queueStats.failed}</div>
                  <p className="text-xs text-muted-foreground">Require attention</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Queue Items */}
          <Card>
            <CardHeader>
              <CardTitle>Queue Items</CardTitle>
              <CardDescription>
                {queueData?.pagination.total ?? 0} total items in queue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {queueData?.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {item.status === 'PENDING' && <Clock className="h-5 w-5 text-gray-500" />}
                    {item.status === 'PROCESSING' && <Activity className="h-5 w-5 text-blue-500 animate-pulse" />}
                    {item.status === 'COMPLETED' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {item.status === 'FAILED' && <XCircle className="h-5 w-5 text-red-500" />}

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getWorkflowColor(item.workflowType)}>
                            {item.workflowType.replace(/_/g, ' ')}
                          </Badge>
                          {getQueueStatusBadge(item.status)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Attempt {item.attempts}/{item.maxAttempts}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Created: {new Date(item.createdAt).toLocaleString()}</span>
                        <span>Scheduled: {new Date(item.scheduledFor).toLocaleString()}</span>
                      </div>

                      {item.error && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          <strong>Error:</strong> {item.error}
                        </div>
                      )}

                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View payload
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(item.payload, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                ))}

                {queueData?.items.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No items in queue. Webhooks will add items here when triggered.
                  </p>
                )}
              </div>

              {/* Pagination */}
              {queueData && queueData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Page {queueData.pagination.page} of {queueData.pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQueuePage(p => Math.max(1, p - 1))}
                      disabled={queuePage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQueuePage(p => p + 1)}
                      disabled={queuePage >= queueData.pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
