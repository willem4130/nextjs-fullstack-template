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

export interface Parameter {
  id: string
  name: string
  displayName: string
  value: number
  unit: string | null
  category: string | null
  description: string | null
  createdAt: Date
  updatedAt: Date
}

interface ParameterListProps {
  parameters: Parameter[]
  onCreateNew: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function ParameterList({ parameters, onCreateNew, onEdit, onDelete }: ParameterListProps) {
  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    }).format(value)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Parameters</CardTitle>
            <CardDescription>
              Manage global parameters used across scenarios
            </CardDescription>
          </div>
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            New Parameter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {parameters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No parameters yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Create your first parameter to define global constants for use in formulas
            </p>
            <Button onClick={onCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Parameter
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Display Name</TableHead>
                <TableHead>Machine Name</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parameters.map((parameter) => (
                <TableRow key={parameter.id}>
                  <TableCell className="font-medium">{parameter.displayName}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {parameter.name}
                  </TableCell>
                  <TableCell className="text-right font-mono text-lg font-semibold">
                    {formatValue(parameter.value)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {parameter.unit || '—'}
                  </TableCell>
                  <TableCell>
                    {parameter.category ? (
                      <Badge variant="outline">{parameter.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                    {parameter.description || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(parameter.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(parameter.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
