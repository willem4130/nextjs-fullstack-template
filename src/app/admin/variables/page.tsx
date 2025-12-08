"use client"

import { useState } from "react"
import { VariableList, type Variable } from "@/components/admin/VariableList"
import { VariableForm, type VariableFormValues } from "@/components/admin/VariableForm"
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

export default function VariablesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null)
  const [deletingVariableId, setDeletingVariableId] = useState<string | null>(null)

  // Get organization ID dynamically
  const { data: org } = api.organization.getFirst.useQuery()
  const organizationId = org?.id ?? ''

  // Query variables from database
  const { data: dbVariables = [], refetch } = api.variable.list.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  )

  // Transform database variables to UI format
  const variables: Variable[] = dbVariables.map((v) => ({
    id: v.id,
    name: v.name,
    displayName: v.displayName,
    variableType: v.variableType,
    category: v.category,
    unit: v.unit,
    formula: v.formula,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    hasDependencies: false, // Will be set by delete mutation error
  }))

  // Mutations
  const createMutation = api.variable.create.useMutation({
    onSuccess: () => {
      refetch()
      setIsCreateDialogOpen(false)
      setEditingVariable(null)
      toast.success("Variable created successfully")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = api.variable.update.useMutation({
    onSuccess: () => {
      refetch()
      setIsCreateDialogOpen(false)
      setEditingVariable(null)
      toast.success("Variable updated successfully")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = api.variable.delete.useMutation({
    onSuccess: () => {
      refetch()
      setDeletingVariableId(null)
      toast.success("Variable deleted successfully")
    },
    onError: (error) => {
      toast.error(error.message)
      setDeletingVariableId(null)
    },
  })

  const handleCreateNew = () => {
    setEditingVariable(null)
    setIsCreateDialogOpen(true)
  }

  const handleEdit = (id: string) => {
    const variable = variables.find((v) => v.id === id)
    if (variable) {
      setEditingVariable(variable)
      setIsCreateDialogOpen(true)
    }
  }

  const handleDelete = (id: string) => {
    setDeletingVariableId(id)
  }

  const confirmDelete = () => {
    if (deletingVariableId && organizationId) {
      deleteMutation.mutate({
        organizationId,
        id: deletingVariableId,
      })
    }
  }

  const handleSubmit = async (values: VariableFormValues) => {
    if (!organizationId) {
      toast.error("Organization not found")
      return
    }

    if (editingVariable) {
      // Update existing variable
      updateMutation.mutate({
        organizationId,
        id: editingVariable.id,
        displayName: values.displayName,
        unit: values.unit || undefined,
        formula: values.formula || undefined,
        dependencies: [], // TODO: Parse from formula
        effectCurveId: undefined,
      })
    } else {
      // Create new variable
      createMutation.mutate({
        organizationId,
        name: values.name,
        displayName: values.displayName,
        variableType: values.variableType,
        unit: values.unit || undefined,
        formula: values.formula || undefined,
        dependencies: [], // TODO: Parse from formula
        effectCurveId: undefined,
      })
    }
  }

  const handleCancel = () => {
    setIsCreateDialogOpen(false)
    setEditingVariable(null)
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Variables</h1>
          <p className="text-muted-foreground">
            Define input and output variables for your supply chain model
          </p>
        </div>
      </div>

      <VariableList
        variables={variables}
        onCreateNew={handleCreateNew}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVariable ? "Edit Variable" : "Create New Variable"}
            </DialogTitle>
            <DialogDescription>
              {editingVariable
                ? "Update the variable details below"
                : "Define a new input or output variable for your model"}
            </DialogDescription>
          </DialogHeader>
          <VariableForm
            defaultValues={
              editingVariable
                ? {
                    name: editingVariable.name,
                    displayName: editingVariable.displayName,
                    variableType: editingVariable.variableType as "INPUT" | "OUTPUT",
                    category: editingVariable.category || undefined,
                    unit: editingVariable.unit || undefined,
                    formula: editingVariable.formula || undefined,
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            isEditing={!!editingVariable}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletingVariableId !== null}
        onOpenChange={(open) => !open && setDeletingVariableId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Variable</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this variable? This action cannot be undone.
              If this variable is used in other formulas, deletion will fail.
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
