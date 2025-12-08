"use client"

import { useState } from "react"
import { ParameterList, type Parameter } from "@/components/admin/ParameterList"
import { ParameterForm, type ParameterFormValues } from "@/components/admin/ParameterForm"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { api } from "@/trpc/react"
import { toast } from "sonner"

export default function ParametersPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingParameter, setEditingParameter] = useState<Parameter | null>(null)
  const [deletingParameterId, setDeletingParameterId] = useState<string | null>(null)

  // Get organization ID dynamically
  const { data: org } = api.organization.getFirst.useQuery()
  const organizationId = org?.id ?? ''

  // Query parameters from database
  const { data: dbParameters = [], refetch } = api.parameter.list.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  )

  // Transform database parameters to UI format
  const parameters: Parameter[] = dbParameters.map((p) => ({
    id: p.id,
    name: p.name,
    displayName: p.displayName,
    value: p.value,
    unit: p.unit,
    category: p.category,
    description: p.description,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }))

  // Mutations
  const createMutation = api.parameter.create.useMutation({
    onSuccess: () => {
      refetch()
      setIsCreateDialogOpen(false)
      setEditingParameter(null)
      toast.success("Parameter created successfully")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = api.parameter.update.useMutation({
    onSuccess: () => {
      refetch()
      setIsCreateDialogOpen(false)
      setEditingParameter(null)
      toast.success("Parameter updated successfully")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = api.parameter.delete.useMutation({
    onSuccess: () => {
      refetch()
      setDeletingParameterId(null)
      toast.success("Parameter deleted successfully")
    },
    onError: (error) => {
      toast.error(error.message)
      setDeletingParameterId(null)
    },
  })

  const handleCreateNew = () => {
    setEditingParameter(null)
    setIsCreateDialogOpen(true)
  }

  const handleEdit = (id: string) => {
    const parameter = parameters.find((p) => p.id === id)
    if (parameter) {
      setEditingParameter(parameter)
      setIsCreateDialogOpen(true)
    }
  }

  const handleDelete = (id: string) => {
    setDeletingParameterId(id)
  }

  const confirmDelete = () => {
    if (deletingParameterId && organizationId) {
      deleteMutation.mutate({
        organizationId,
        id: deletingParameterId,
      })
    }
  }

  const handleSubmit = async (values: ParameterFormValues) => {
    if (!organizationId) {
      toast.error("Organization not found")
      return
    }

    if (editingParameter) {
      // Update existing parameter
      updateMutation.mutate({
        organizationId,
        id: editingParameter.id,
        displayName: values.displayName,
        value: values.value,
        unit: values.unit || undefined,
        description: values.description || undefined,
      })
    } else {
      // Create new parameter
      createMutation.mutate({
        organizationId,
        name: values.name,
        displayName: values.displayName,
        value: values.value,
        unit: values.unit || undefined,
        description: values.description || undefined,
      })
    }
  }

  const handleCancel = () => {
    setIsCreateDialogOpen(false)
    setEditingParameter(null)
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parameters</h1>
          <p className="text-muted-foreground">
            Manage global parameters used across scenarios
          </p>
        </div>
      </div>

      <ParameterList
        parameters={parameters}
        onCreateNew={handleCreateNew}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingParameter ? "Edit Parameter" : "Create New Parameter"}
            </DialogTitle>
            <DialogDescription>
              {editingParameter
                ? "Update the parameter details below"
                : "Define a new global parameter for use in formulas"}
            </DialogDescription>
          </DialogHeader>
          <ParameterForm
            defaultValues={
              editingParameter
                ? {
                    name: editingParameter.name,
                    displayName: editingParameter.displayName,
                    value: editingParameter.value,
                    unit: editingParameter.unit || undefined,
                    category: editingParameter.category || undefined,
                    description: editingParameter.description || undefined,
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            isEditing={!!editingParameter}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletingParameterId !== null}
        onOpenChange={(open) => !open && setDeletingParameterId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Parameter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this parameter? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
