'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mail, Plus, Pencil, Trash2, Eye, RefreshCw, Info } from 'lucide-react'
import { api } from '@/trpc/react'

type TemplateType = 'CONTRACT_REMINDER' | 'HOURS_REMINDER' | 'CUSTOM'

const typeLabels: Record<TemplateType, string> = {
  CONTRACT_REMINDER: 'Contract Herinnering',
  HOURS_REMINDER: 'Uren Herinnering',
  CUSTOM: 'Aangepast',
}

const typeBadgeVariants: Record<TemplateType, 'default' | 'secondary' | 'outline'> = {
  CONTRACT_REMINDER: 'default',
  HOURS_REMINDER: 'secondary',
  CUSTOM: 'outline',
}

export default function EmailTemplatesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewSubject, setPreviewSubject] = useState('')

  // Form state
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<TemplateType>('CUSTOM')
  const [formDescription, setFormDescription] = useState('')
  const [formSubject, setFormSubject] = useState('')
  const [formBodyHtml, setFormBodyHtml] = useState('')

  // API calls
  const { data: templates, isLoading, refetch } = api.emailTemplates.getAll.useQuery()
  const { data: variables } = api.emailTemplates.getVariables.useQuery()

  const createTemplate = api.emailTemplates.create.useMutation({
    onSuccess: () => {
      setIsDialogOpen(false)
      resetForm()
      refetch()
    },
  })

  const updateTemplate = api.emailTemplates.update.useMutation({
    onSuccess: () => {
      setIsDialogOpen(false)
      resetForm()
      refetch()
    },
  })

  const deleteTemplate = api.emailTemplates.delete.useMutation({
    onSuccess: () => refetch(),
  })

  const seedDefaults = api.emailTemplates.seedDefaults.useMutation({
    onSuccess: (data) => {
      alert(data.message)
      refetch()
    },
  })

  const { data: preview } = api.emailTemplates.preview.useQuery(
    { subject: formSubject, bodyHtml: formBodyHtml },
    { enabled: isPreviewOpen && formSubject.length > 0 }
  )

  const resetForm = () => {
    setEditingId(null)
    setFormName('')
    setFormType('CUSTOM')
    setFormDescription('')
    setFormSubject('')
    setFormBodyHtml('')
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (template: NonNullable<typeof templates>[number]) => {
    setEditingId(template.id)
    setFormName(template.name)
    setFormType(template.type as TemplateType)
    setFormDescription(template.description || '')
    setFormSubject(template.subject)
    setFormBodyHtml(template.bodyHtml)
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (editingId) {
      updateTemplate.mutate({
        id: editingId,
        name: formName,
        description: formDescription || undefined,
        subject: formSubject,
        bodyHtml: formBodyHtml,
      })
    } else {
      createTemplate.mutate({
        name: formName,
        type: formType,
        description: formDescription || undefined,
        subject: formSubject,
        bodyHtml: formBodyHtml,
      })
    }
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Weet je zeker dat je template "${name}" wilt verwijderen?`)) {
      deleteTemplate.mutate({ id })
    }
  }

  const openPreview = () => {
    setPreviewSubject(formSubject)
    setPreviewHtml(formBodyHtml)
    setIsPreviewOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">E-mail Templates</h1>
          <p className="text-muted-foreground">
            Beheer e-mail templates voor project communicatie
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => seedDefaults.mutate()} disabled={seedDefaults.isPending}>
            {seedDefaults.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Standaard Templates
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nieuwe Template
          </Button>
        </div>
      </div>

      {/* Variables Reference Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            <CardTitle className="text-base">Beschikbare Variabelen</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {variables?.available.map((v) => (
              <Badge key={v} variant="outline" className="font-mono">
                {`{{${v}}}`}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>Templates</CardTitle>
          </div>
          <CardDescription>
            {templates?.length || 0} template(s) beschikbaar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Laden...</div>
          ) : templates?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen templates gevonden. Klik op &quot;Standaard Templates&quot; om te beginnen.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Onderwerp</TableHead>
                  <TableHead>Verzonden</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates?.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <Badge variant={typeBadgeVariants[template.type as TemplateType]}>
                        {typeLabels[template.type as TemplateType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {template.subject}
                    </TableCell>
                    <TableCell>{template._count.sentEmails}x</TableCell>
                    <TableCell>
                      <Badge variant={template.isActive ? 'default' : 'secondary'}>
                        {template.isActive ? 'Actief' : 'Inactief'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(template)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(template.id, template.name)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Template Bewerken' : 'Nieuwe Template'}
            </DialogTitle>
            <DialogDescription>
              Maak of bewerk een e-mail template. Gebruik {`{{variabele}}`} voor dynamische content.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="edit">
            <TabsList>
              <TabsTrigger value="edit">Bewerken</TabsTrigger>
              <TabsTrigger value="preview" onClick={openPreview}>
                <Eye className="mr-2 h-4 w-4" />
                Voorbeeld
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Naam</Label>
                  <Input
                    id="name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contract Herinnering"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formType}
                    onValueChange={(v) => setFormType(v as TemplateType)}
                    disabled={!!editingId}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONTRACT_REMINDER">Contract Herinnering</SelectItem>
                      <SelectItem value="HOURS_REMINDER">Uren Herinnering</SelectItem>
                      <SelectItem value="CUSTOM">Aangepast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beschrijving (optioneel)</Label>
                <Input
                  id="description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Template voor het herinneren van teamleden..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Onderwerp</Label>
                <Input
                  id="subject"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="Contract vereist voor {{projectName}}"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bodyHtml">Body (HTML)</Label>
                <Textarea
                  id="bodyHtml"
                  value={formBodyHtml}
                  onChange={(e) => setFormBodyHtml(e.target.value)}
                  placeholder="<p>Beste {{memberFirstName}},</p>..."
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>

              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">
                  <strong>Tip:</strong> Beschikbare variabelen:{' '}
                  {variables?.available.slice(0, 5).map((v) => `{{${v}}}`).join(', ')}...
                </p>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              {preview ? (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground mb-1">Onderwerp:</p>
                    <p className="font-medium">{preview.subject}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground mb-2">Body:</p>
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: preview.bodyHtml }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Voer onderwerp en body in om een voorbeeld te zien.
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !formName || !formSubject || !formBodyHtml ||
                createTemplate.isPending || updateTemplate.isPending
              }
            >
              {createTemplate.isPending || updateTemplate.isPending ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
