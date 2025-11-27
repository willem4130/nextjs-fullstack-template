'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileUp, Clock, CheckCircle2, XCircle, Upload, Eye, Download } from 'lucide-react'
import { api } from '@/trpc/react'

type DocumentStatus = 'PENDING' | 'UPLOADED' | 'VERIFIED' | 'REJECTED' | 'EXPIRED'

const statusConfig: Record<DocumentStatus, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  PENDING: { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Wachtend' },
  UPLOADED: { icon: Upload, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Geupload' },
  VERIFIED: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Geverifieerd' },
  REJECTED: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Afgewezen' },
  EXPIRED: { icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Verlopen' },
}

export default function DocumentRequestsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Document Verzoeken</h1>
        <p className="text-muted-foreground">
          Beheer document upload verzoeken en hun status
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totaal</CardTitle>
            <FileUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Alle verzoeken</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wachtend</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Nog niet geupload</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Geupload</CardTitle>
            <Upload className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Te beoordelen</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Geverifieerd</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Goedgekeurd</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            <CardTitle>Verzoeken</CardTitle>
          </div>
          <CardDescription>
            Alle document upload verzoeken
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Alle</TabsTrigger>
              <TabsTrigger value="pending">Wachtend</TabsTrigger>
              <TabsTrigger value="uploaded">Geupload</TabsTrigger>
              <TabsTrigger value="verified">Geverifieerd</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <div className="text-center py-12 text-muted-foreground">
                <FileUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Binnenkort beschikbaar</p>
                <p className="text-sm">
                  Deze pagina toont straks alle document verzoeken met hun status.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
