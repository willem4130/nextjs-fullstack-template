'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClipboardList, Users, Calendar, Send } from 'lucide-react'

export default function HoursReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Uren Rapporten</h1>
        <p className="text-muted-foreground">
          Genereer en verstuur gedetailleerde uren rapporten naar freelancers
        </p>
      </div>

      {/* Coming Soon Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            <CardTitle>Uren Rapport Genereren</CardTitle>
          </div>
          <CardDescription>
            Selecteer een medewerker, periode en projecten om een rapport te genereren
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Binnenkort beschikbaar</p>
            <p className="text-sm max-w-md mx-auto mt-2">
              Hier kun je straks gedetailleerde uren rapporten genereren met:
            </p>
            <ul className="text-sm mt-4 space-y-1">
              <li>- Uren per project met uurtarief</li>
              <li>- Kilometers met km-tarief</li>
              <li>- Onkosten</li>
              <li>- Totaaloverzicht voor facturatie</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* How it will work */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <Users className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-base">1. Selecteer Medewerker</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Kies de freelancer voor wie je een rapport wilt genereren
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <Calendar className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-base">2. Kies Periode</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Selecteer de maand of een aangepaste periode
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <Send className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-base">3. Verstuur Rapport</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Bekijk het rapport en verstuur naar de freelancer
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
