'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/trpc/react'
import { useState, useEffect } from 'react'
import { Play, Settings2, FileText, Clock, DollarSign, CheckCircle2 } from 'lucide-react'

type WorkflowType = 'contractDistribution' | 'hoursReminder' | 'invoiceGeneration'

export default function WorkflowsPage() {
  const { data: projects, isLoading } = api.projects.getAll.useQuery({
    page: 1,
    limit: 50,
  })

  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [enabledWorkflows, setEnabledWorkflows] = useState<Set<WorkflowType>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Query to get existing workflow config
  const { data: workflowConfig } = api.workflows.getConfig.useQuery(
    { projectId: selectedProject! },
    { enabled: !!selectedProject }
  )

  // Mutation to save workflow config
  const saveConfig = api.workflows.saveConfig.useMutation({
    onSuccess: () => {
      setIsSaving(false)
      setSaveMessage({ type: 'success', text: '✅ Workflows saved and activated successfully!' })
      setTimeout(() => setSaveMessage(null), 5000)
    },
    onError: (error) => {
      setIsSaving(false)
      setSaveMessage({ type: 'error', text: `❌ Failed to save: ${error.message}` })
      setTimeout(() => setSaveMessage(null), 5000)
    },
  })

  // Load existing config when project is selected
  useEffect(() => {
    if (workflowConfig) {
      const workflows = new Set<WorkflowType>()
      if (workflowConfig.contractDistribution) workflows.add('contractDistribution')
      if (workflowConfig.hoursReminder) workflows.add('hoursReminder')
      if (workflowConfig.invoiceGeneration) workflows.add('invoiceGeneration')
      setEnabledWorkflows(workflows)
    } else {
      setEnabledWorkflows(new Set())
    }
  }, [workflowConfig])

  // Reset workflows when project changes
  useEffect(() => {
    if (!selectedProject) {
      setEnabledWorkflows(new Set())
    }
  }, [selectedProject])

  const workflows = [
    {
      type: 'contractDistribution' as WorkflowType,
      name: 'Contract Distribution',
      description: 'Automatically send contracts to team members on new projects',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      type: 'hoursReminder' as WorkflowType,
      name: 'Hours Reminders',
      description: 'Smart reminders for team members to submit their hours',
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      type: 'invoiceGeneration' as WorkflowType,
      name: 'Invoice Generation',
      description: 'Automatic invoice creation based on approved hours',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ]

  const handleSaveWorkflows = () => {
    if (!selectedProject) return

    setIsSaving(true)
    setSaveMessage(null)

    saveConfig.mutate({
      projectId: selectedProject,
      config: {
        contractDistribution: enabledWorkflows.has('contractDistribution'),
        hoursReminder: enabledWorkflows.has('hoursReminder'),
        invoiceGeneration: enabledWorkflows.has('invoiceGeneration'),
      },
    })
  }

  const toggleWorkflow = (type: WorkflowType) => {
    const newSet = new Set(enabledWorkflows)
    if (newSet.has(type)) {
      newSet.delete(type)
    } else {
      newSet.add(type)
    }
    setEnabledWorkflows(newSet)
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflow Configuration</h1>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workflow Configuration</h1>
        <p className="text-muted-foreground">
          Configure automation workflows for your Simplicate projects
        </p>
      </div>

      {/* No Projects Message */}
      {projects?.projects.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Projects Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sync your Simplicate projects first to configure workflows
            </p>
            <Button onClick={() => (window.location.href = '/admin/settings')}>
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Project Selection */}
      {projects && projects.projects.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Select Project</CardTitle>
              <CardDescription>Choose a project to configure its automation workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {projects.projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project.id)}
                    className={`flex items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-muted ${
                      selectedProject === project.id ? 'border-primary bg-muted' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {project.clientName || 'No client'} • {project.projectNumber || 'No number'}
                      </div>
                    </div>
                    <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {project.status}
                    </Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Workflow Configuration */}
          {selectedProject && (
            <>
              {saveMessage && (
                <div
                  className={`rounded-lg border p-3 text-sm ${
                    saveMessage.type === 'success'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {saveMessage.text}
                </div>
              )}
              <div className="text-lg font-semibold">Available Workflows</div>
              <div className="grid gap-4 md:grid-cols-3">
                {workflows.map((workflow) => {
                  const Icon = workflow.icon
                  const isEnabled = enabledWorkflows.has(workflow.type)

                  return (
                    <Card
                      key={workflow.type}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isEnabled ? 'border-primary' : ''
                      }`}
                      onClick={() => toggleWorkflow(workflow.type)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className={`rounded-lg p-2 ${workflow.bgColor}`}>
                            <Icon className={`h-6 w-6 ${workflow.color}`} />
                          </div>
                          {isEnabled && (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <CardTitle className="text-lg">{workflow.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {workflow.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          variant={isEnabled ? 'default' : 'outline'}
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleWorkflow(workflow.type)
                          }}
                        >
                          {isEnabled ? 'Enabled' : 'Enable'}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Save Configuration */}
              {enabledWorkflows.size > 0 && (
                <Card className="border-primary">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">Ready to Save</div>
                        <div className="text-sm text-muted-foreground">
                          {enabledWorkflows.size} workflow{enabledWorkflows.size !== 1 ? 's' : ''}{' '}
                          selected
                        </div>
                      </div>
                      <Button size="lg" onClick={handleSaveWorkflows} disabled={isSaving}>
                        <Play className="mr-2 h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save & Activate'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
