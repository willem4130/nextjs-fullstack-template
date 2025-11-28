import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import type { Prisma } from '@prisma/client'
import { randomBytes } from 'crypto'

// Generate portal access token
function generatePortalToken(): string {
  return randomBytes(32).toString('hex')
}

export const employeePortalRouter = createTRPCRouter({
  // Generate a portal access link for an employee
  generateAccessLink: publicProcedure
    .input(z.object({ employeeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const employee = await ctx.db.user.findUnique({
        where: { id: input.employeeId },
        select: { id: true, email: true, name: true },
      })

      if (!employee) {
        throw new Error('Employee not found')
      }

      // Generate a new token
      const token = generatePortalToken()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30) // Valid for 30 days

      // Store the token (we'll use a simple portal_tokens table or SystemConfig)
      // For now, use SystemConfig with JSON
      const key = `portal_token_${token}`
      await ctx.db.systemConfig.upsert({
        where: { key },
        create: {
          key,
          value: JSON.stringify({
            userId: employee.id,
            email: employee.email,
            expiresAt: expiresAt.toISOString(),
          }),
          description: `Portal access token for ${employee.name || employee.email}`,
        },
        update: {
          value: JSON.stringify({
            userId: employee.id,
            email: employee.email,
            expiresAt: expiresAt.toISOString(),
          }),
        },
      })

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://simplicate-automations.vercel.app'
      return {
        token,
        url: `${baseUrl}/portal/${token}`,
        expiresAt,
        employee: {
          id: employee.id,
          email: employee.email,
          name: employee.name,
        },
      }
    }),

  // Validate a portal token and get employee data
  validateToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const key = `portal_token_${input.token}`
      const config = await ctx.db.systemConfig.findUnique({
        where: { key },
      })

      if (!config) {
        return { valid: false, error: 'Invalid token' }
      }

      const data = JSON.parse(config.value) as {
        userId: string
        email: string
        expiresAt: string
      }

      if (new Date(data.expiresAt) < new Date()) {
        return { valid: false, error: 'Token expired' }
      }

      const employee = await ctx.db.user.findUnique({
        where: { id: data.userId },
        select: {
          id: true,
          name: true,
          email: true,
          employeeType: true,
          image: true,
        },
      })

      if (!employee) {
        return { valid: false, error: 'Employee not found' }
      }

      return {
        valid: true,
        employee,
        expiresAt: data.expiresAt,
      }
    }),

  // Get employee's hours summary
  getMyHours: publicProcedure
    .input(
      z.object({
        token: z.string(),
        month: z.string().optional(), // YYYY-MM format
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      // Validate token first
      const key = `portal_token_${input.token}`
      const config = await ctx.db.systemConfig.findUnique({ where: { key } })

      if (!config) {
        throw new Error('Invalid token')
      }

      const tokenData = JSON.parse(config.value) as { userId: string; expiresAt: string }
      if (new Date(tokenData.expiresAt) < new Date()) {
        throw new Error('Token expired')
      }

      const userId = tokenData.userId

      // Build date range
      let dateFilter: Prisma.HoursEntryWhereInput['date'] = undefined
      if (input.month) {
        const [year, month] = input.month.split('-').map(Number)
        const start = new Date(year!, month! - 1, 1)
        const end = new Date(year!, month!, 0, 23, 59, 59)
        dateFilter = { gte: start, lte: end }
      }

      // Get hours grouped by project and month
      const hours = await ctx.db.hoursEntry.findMany({
        where: {
          userId,
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              clientName: true,
            },
          },
          projectService: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        take: input.limit,
      })

      // Get totals
      const totals = await ctx.db.hoursEntry.aggregate({
        where: {
          userId,
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        _sum: { hours: true, revenue: true },
        _count: true,
      })

      // Group by project for summary
      const byProject = new Map<
        string,
        { projectId: string; projectName: string; clientName: string | null; totalHours: number }
      >()
      for (const entry of hours) {
        const existing = byProject.get(entry.projectId)
        if (existing) {
          existing.totalHours += entry.hours
        } else {
          byProject.set(entry.projectId, {
            projectId: entry.projectId,
            projectName: entry.project.name,
            clientName: entry.project.clientName,
            totalHours: entry.hours,
          })
        }
      }

      return {
        entries: hours.map((h) => ({
          id: h.id,
          date: h.date,
          hours: h.hours,
          description: h.description,
          projectName: h.project.name,
          clientName: h.project.clientName,
          serviceName: h.projectService?.name || null,
          status: h.status,
        })),
        summary: {
          totalHours: totals._sum.hours || 0,
          totalEntries: totals._count,
          byProject: Array.from(byProject.values()),
        },
      }
    }),

  // Get employee's available months
  getAvailableMonths: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      // Validate token
      const key = `portal_token_${input.token}`
      const config = await ctx.db.systemConfig.findUnique({ where: { key } })

      if (!config) {
        throw new Error('Invalid token')
      }

      const tokenData = JSON.parse(config.value) as { userId: string; expiresAt: string }
      if (new Date(tokenData.expiresAt) < new Date()) {
        throw new Error('Token expired')
      }

      const userId = tokenData.userId

      // Get distinct months with hours
      const entries = await ctx.db.hoursEntry.findMany({
        where: { userId },
        select: { date: true },
        orderBy: { date: 'desc' },
      })

      const monthNames = [
        'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
        'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
      ]

      const monthsSet = new Set<string>()
      const months: { value: string; label: string }[] = []

      for (const entry of entries) {
        const year = entry.date.getFullYear()
        const month = entry.date.getMonth()
        const value = `${year}-${String(month + 1).padStart(2, '0')}`

        if (!monthsSet.has(value)) {
          monthsSet.add(value)
          months.push({
            value,
            label: `${monthNames[month]} ${year}`,
          })
        }
      }

      return months
    }),

  // Get employee's kilometers and expenses
  getMyExpenses: publicProcedure
    .input(
      z.object({
        token: z.string(),
        month: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Validate token
      const key = `portal_token_${input.token}`
      const config = await ctx.db.systemConfig.findUnique({ where: { key } })

      if (!config) {
        throw new Error('Invalid token')
      }

      const tokenData = JSON.parse(config.value) as { userId: string; expiresAt: string }
      if (new Date(tokenData.expiresAt) < new Date()) {
        throw new Error('Token expired')
      }

      const userId = tokenData.userId

      // Build date range
      let dateFilter: Prisma.ExpenseWhereInput['date'] = undefined
      if (input.month) {
        const [year, month] = input.month.split('-').map(Number)
        const start = new Date(year!, month! - 1, 1)
        const end = new Date(year!, month!, 0, 23, 59, 59)
        dateFilter = { gte: start, lte: end }
      }

      // Get kilometers
      const kilometers = await ctx.db.expense.findMany({
        where: {
          userId,
          category: 'KILOMETERS',
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        include: {
          project: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
      })

      // Get other expenses
      const otherExpenses = await ctx.db.expense.findMany({
        where: {
          userId,
          category: { not: 'KILOMETERS' },
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        include: {
          project: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
      })

      // Get km rate
      const settings = await ctx.db.appSettings.findFirst()
      const kmRate = settings?.kmRate || 0.23

      const totalKm = kilometers.reduce((sum, e) => sum + (e.kilometers || 0), 0)
      const totalExpenses = otherExpenses.reduce((sum, e) => sum + e.amount, 0)

      return {
        kilometers: {
          entries: kilometers.map((k) => ({
            id: k.id,
            date: k.date,
            km: k.kilometers || 0,
            description: k.description,
            projectName: k.project.name,
            status: k.status,
          })),
          totalKm,
          kmRate,
          totalAmount: totalKm * kmRate,
        },
        expenses: {
          entries: otherExpenses.map((e) => ({
            id: e.id,
            date: e.date,
            amount: e.amount,
            category: e.category,
            description: e.description,
            projectName: e.project.name,
            status: e.status,
          })),
          totalAmount: totalExpenses,
        },
      }
    }),

  // Get all employees for admin to generate links
  getAllEmployees: publicProcedure.query(async ({ ctx }) => {
    const employees = await ctx.db.user.findMany({
      where: {
        // Filter out empty emails (email is required, but check just in case)
        email: { not: '' },
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeType: true,
      },
      orderBy: { name: 'asc' },
    })

    return employees
  }),

  // Get employee's document requests
  getMyDocumentRequests: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      // Validate token
      const key = `portal_token_${input.token}`
      const config = await ctx.db.systemConfig.findUnique({ where: { key } })

      if (!config) {
        throw new Error('Invalid token')
      }

      const tokenData = JSON.parse(config.value) as { userId: string; expiresAt: string }
      if (new Date(tokenData.expiresAt) < new Date()) {
        throw new Error('Token expired')
      }

      const userId = tokenData.userId

      const requests = await ctx.db.documentRequest.findMany({
        where: { userId },
        include: {
          project: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      return requests.map((r) => ({
        id: r.id,
        type: r.type,
        description: r.description,
        status: r.status,
        projectName: r.project.name,
        requestedAt: r.requestedAt,
        uploadedAt: r.uploadedAt,
        documentName: r.documentName,
        uploadToken: r.uploadToken,
      }))
    }),
})
