'use client'

import { useState } from 'react'
import { api } from '@/trpc/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Link, Copy, Check, ExternalLink, Users, Search } from 'lucide-react'

export default function AdminPortalPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [generatedLinks, setGeneratedLinks] = useState<
    Map<string, { url: string; expiresAt: Date }>
  >(new Map())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Get all employees
  const { data: employees, isLoading } = api.employeePortal.getAllEmployees.useQuery()

  // Generate access link mutation
  const generateLink = api.employeePortal.generateAccessLink.useMutation({
    onSuccess: (data) => {
      setGeneratedLinks((prev) => {
        const newMap = new Map(prev)
        newMap.set(data.employee.id, { url: data.url, expiresAt: data.expiresAt })
        return newMap
      })
      toast.success(`Link gegenereerd voor ${data.employee.name || data.employee.email}`)
    },
    onError: (error) => {
      toast.error(`Fout: ${error.message}`)
    },
  })

  // Filter employees based on search
  const filteredEmployees = employees?.filter((emp) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      emp.name?.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query)
    )
  })

  // Copy link to clipboard
  const copyLink = async (employeeId: string, url: string) => {
    await navigator.clipboard.writeText(url)
    setCopiedId(employeeId)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success('Link gekopieerd naar klembord')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Medewerker Portal</h1>
        <p className="text-muted-foreground">
          Genereer toegangslinks voor medewerkers om hun uren en documenten te bekijken
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Hoe werkt het?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            1. Klik op &quot;Genereer link&quot; naast een medewerker
          </p>
          <p>
            2. Kopieer de link en stuur deze naar de medewerker (bijv. via e-mail)
          </p>
          <p>
            3. De medewerker kan nu inloggen en eigen uren, kilometers en documenten bekijken
          </p>
          <p className="text-xs">
            Links zijn 30 dagen geldig. Je kunt altijd een nieuwe link genereren.
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Totaal medewerkers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Links gegenereerd</CardTitle>
            <Link className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{generatedLinks.size}</div>
            <p className="text-xs text-muted-foreground">in deze sessie</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Geldigheid</CardTitle>
            <Badge variant="outline">30 dagen</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Links verlopen automatisch na 30 dagen
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Medewerkers</CardTitle>
          <CardDescription>
            Selecteer een medewerker om een portal-link te genereren
          </CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam of e-mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredEmployees?.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {searchQuery ? 'Geen medewerkers gevonden' : 'Geen medewerkers beschikbaar'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees?.map((employee) => {
                  const linkData = generatedLinks.get(employee.id)
                  return (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.name || '-'}
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {employee.employeeType || 'Onbekend'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {linkData ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyLink(employee.id, linkData.url)}
                              >
                                {copiedId === employee.id ? (
                                  <>
                                    <Check className="mr-1 h-3 w-3" />
                                    Gekopieerd
                                  </>
                                ) : (
                                  <>
                                    <Copy className="mr-1 h-3 w-3" />
                                    Kopieer
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <a
                                  href={linkData.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="mr-1 h-3 w-3" />
                                  Open
                                </a>
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => generateLink.mutate({ employeeId: employee.id })}
                              disabled={generateLink.isPending}
                            >
                              <Link className="mr-1 h-3 w-3" />
                              {generateLink.isPending ? 'Bezig...' : 'Genereer link'}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generated Links Summary */}
      {generatedLinks.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gegenereerde Links</CardTitle>
            <CardDescription>
              Links die in deze sessie zijn gegenereerd
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from(generatedLinks.entries()).map(([employeeId, data]) => {
                const employee = employees?.find((e) => e.id === employeeId)
                return (
                  <div
                    key={employeeId}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{employee?.name || employee?.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Geldig tot{' '}
                        {new Date(data.expiresAt).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(employeeId, data.url)}
                      >
                        {copiedId === employeeId ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={data.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
