"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Plus, Pencil, Trash2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export interface Variable {
  id: string
  name: string
  displayName: string
  variableType: string
  category: string | null
  unit: string | null
  formula: string | null
  createdAt: Date
  updatedAt: Date
  hasDependencies?: boolean
}

interface VariableListProps {
  variables: Variable[]
  onCreateNew: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function VariableList({ variables, onCreateNew, onEdit, onDelete }: VariableListProps) {
  const getTypeColor = (type: string) => {
    return type === 'INPUT' ? 'default' : 'secondary'
  }

  const truncateFormula = (formula: string | null) => {
    if (!formula) return '—'
    return formula.length > 50 ? formula.substring(0, 50) + '...' : formula
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Variables</CardTitle>
            <CardDescription>
              Define input and output variables for your supply chain model
            </CardDescription>
          </div>
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            New Variable
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {variables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No variables yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Create your first variable to start building your supply chain model
            </p>
            <Button onClick={onCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Variable
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Machine Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Formula</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variables.map((variable) => (
                <TableRow key={variable.id}>
                  <TableCell>
                    <Badge variant={getTypeColor(variable.variableType)}>
                      {variable.variableType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{variable.displayName}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {variable.name}
                  </TableCell>
                  <TableCell>
                    {variable.category ? (
                      <Badge variant="outline">{variable.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {variable.unit || '—'}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground max-w-xs">
                    {truncateFormula(variable.formula)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(variable.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(variable.id)}
                                disabled={variable.hasDependencies}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {variable.hasDependencies && (
                            <TooltipContent>
                              <p>Cannot delete: used in other formulas</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
