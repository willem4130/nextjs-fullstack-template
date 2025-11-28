'use client'

import { useState } from 'react'
import { api } from '@/trpc/react'
import { Bell, Clock, Users, Check, AlertTriangle, Send, RefreshCw } from 'lucide-react'

export default function HoursRemindersPage() {
  const [period, setPeriod] = useState<'previous' | 'current'>('previous')

  const {
    data: preview,
    isLoading,
    refetch,
  } = api.automation.getHoursReminderPreview.useQuery({ period })

  const triggerMutation = api.automation.triggerHoursReminders.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const handleSendReminders = () => {
    if (
      confirm(
        `Dit verstuurt herinnerings-e-mails naar ${preview?.needingReminder} medewerker(s). Doorgaan?`
      )
    ) {
      triggerMutation.mutate({ period })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Uren Herinneringen</h1>
          <p className="text-muted-foreground">
            Verstuur herinneringen naar medewerkers die hun uren nog niet hebben ingevoerd
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'previous' | 'current')}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="previous">Vorige maand</option>
            <option value="current">Deze maand</option>
          </select>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Vernieuwen
          </button>
        </div>
      </div>

      {/* Period Info */}
      {preview && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Periode: {preview.period}</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Totaal medewerkers</p>
              <p className="text-2xl font-bold">{preview?.totalUsers ?? '-'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Herinnering nodig</p>
              <p className="text-2xl font-bold">{preview?.needingReminder ?? '-'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Uren ingevoerd</p>
              <p className="text-2xl font-bold">{preview?.submittedHours ?? '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Send Button */}
      {preview && preview.needingReminder > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {preview.needingReminder} medewerker(s) hebben nog geen uren ingevoerd
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Verstuur een herinnering per e-mail
                </p>
              </div>
            </div>
            <button
              onClick={handleSendReminders}
              disabled={triggerMutation.isPending}
              className="flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {triggerMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Verstuur Herinneringen
            </button>
          </div>
          {triggerMutation.isSuccess && (
            <div className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-200">
              Herinneringen zijn toegevoegd aan de wachtrij en worden binnen 1 minuut verwerkt.
            </div>
          )}
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">Medewerkers Overzicht</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left text-sm font-medium">Medewerker</th>
                <th className="px-6 py-3 text-left text-sm font-medium">E-mail</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Projecten</th>
                <th className="px-6 py-3 text-right text-sm font-medium">Uren</th>
                <th className="px-6 py-3 text-center text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin" />
                    Laden...
                  </td>
                </tr>
              ) : preview?.users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Geen medewerkers gevonden voor deze periode
                  </td>
                </tr>
              ) : (
                preview?.users.map((user) => (
                  <tr key={user.userId} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <span className="font-medium">{user.userName || '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{user.userEmail}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.projects.slice(0, 3).map((project) => (
                          <span
                            key={project.id}
                            className="inline-block rounded bg-muted px-2 py-0.5 text-xs"
                          >
                            {project.name}
                          </span>
                        ))}
                        {user.projects.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{user.projects.length - 3} meer
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={user.hoursLogged < 1 ? 'text-amber-600' : 'text-muted-foreground'}
                      >
                        {user.hoursLogged.toFixed(1)}u
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.needsReminder ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                          <AlertTriangle className="h-3 w-3" />
                          Herinnering
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-200">
                          <Check className="h-3 w-3" />
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <h3 className="font-medium">Automatische Herinneringen</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Herinneringen worden automatisch elke maandag om 8:00 verstuurd voor de vorige maand. Je
          kunt ook handmatig herinneringen versturen via deze pagina.
        </p>
      </div>
    </div>
  )
}
