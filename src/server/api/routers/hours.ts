import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import type { Prisma } from '@prisma/client'

export const hoursRouter = createTRPCRouter({
  // Get all hours entries with filtering
  getAll: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.enum(['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'INVOICED']).optional(),
        projectId: z.string().optional(),
        userId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, status, projectId, userId, startDate, endDate } = input
      const skip = (page - 1) * limit

      const where: Prisma.HoursEntryWhereInput = {}
      if (status) where.status = status
      if (projectId) where.projectId = projectId
      if (userId) where.userId = userId
      if (startDate || endDate) {
        where.date = {}
        if (startDate) where.date.gte = new Date(startDate)
        if (endDate) where.date.lte = new Date(endDate)
      }

      const [entries, total] = await Promise.all([
        ctx.db.hoursEntry.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            project: {
              select: {
                id: true,
                name: true,
                clientName: true,
              },
            },
            projectService: {
              select: {
                id: true,
                name: true,
                budgetHours: true,
                usedHours: true,
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
        }),
        ctx.db.hoursEntry.count({ where }),
      ])

      return {
        entries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    }),

  // Get hours entry by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const entry = await ctx.db.hoursEntry.findUnique({
        where: { id: input.id },
        include: {
          user: true,
          project: true,
        },
      })

      if (!entry) {
        throw new Error('Hours entry not found')
      }

      return entry
    }),

  // Get hours stats
  getStats: publicProcedure.query(async ({ ctx }) => {
    const [total, pending, submitted, approved, rejected, invoiced] = await Promise.all([
      ctx.db.hoursEntry.count(),
      ctx.db.hoursEntry.count({ where: { status: 'PENDING' } }),
      ctx.db.hoursEntry.count({ where: { status: 'SUBMITTED' } }),
      ctx.db.hoursEntry.count({ where: { status: 'APPROVED' } }),
      ctx.db.hoursEntry.count({ where: { status: 'REJECTED' } }),
      ctx.db.hoursEntry.count({ where: { status: 'INVOICED' } }),
    ])

    // Get total hours
    const totalHours = await ctx.db.hoursEntry.aggregate({
      _sum: {
        hours: true,
      },
    })

    // Get hours this week
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const hoursThisWeek = await ctx.db.hoursEntry.aggregate({
      _sum: {
        hours: true,
      },
      where: {
        date: {
          gte: startOfWeek,
        },
      },
    })

    return {
      totalEntries: total,
      pending,
      submitted,
      approved,
      rejected,
      invoiced,
      totalHours: totalHours._sum.hours || 0,
      hoursThisWeek: hoursThisWeek._sum.hours || 0,
    }
  }),

  // Get hours by user (for employee self-service)
  getByUser: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db.hoursEntry.findMany({
        where: { userId: input.userId },
        take: input.limit,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              clientName: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      })

      return entries
    }),

  // Get all project services (diensten) with budget info
  getServices: publicProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        status: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {}
      if (input?.projectId) where.projectId = input.projectId
      if (input?.status) where.status = input.status

      const services = await ctx.db.projectService.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              clientName: true,
            },
          },
          _count: {
            select: {
              hoursEntries: true,
            },
          },
        },
        orderBy: [
          { project: { name: 'asc' } },
          { name: 'asc' },
        ],
      })

      // Calculate budget usage percentage
      return services.map(service => ({
        ...service,
        budgetPercentage: service.budgetHours && service.budgetHours > 0
          ? Math.round((service.usedHours / service.budgetHours) * 100)
          : null,
        remainingHours: service.budgetHours
          ? service.budgetHours - service.usedHours
          : null,
      }))
    }),

  // Get services stats for overview
  getServicesStats: publicProcedure.query(async ({ ctx }) => {
    const services = await ctx.db.projectService.findMany({
      where: {
        status: 'open',
      },
      select: {
        budgetHours: true,
        usedHours: true,
      },
    })

    const totalBudget = services.reduce((sum, s) => sum + (s.budgetHours || 0), 0)
    const totalUsed = services.reduce((sum, s) => sum + s.usedHours, 0)
    const atRisk = services.filter(s => {
      if (!s.budgetHours || s.budgetHours === 0) return false
      return (s.usedHours / s.budgetHours) >= 0.9
    }).length

    return {
      totalServices: services.length,
      totalBudgetHours: totalBudget,
      totalUsedHours: totalUsed,
      overallPercentage: totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0,
      servicesAtRisk: atRisk,
    }
  }),

  // Get projects with hours and budget summary
  getProjectsSummary: publicProcedure
    .input(
      z.object({
        months: z.array(z.string()).optional(), // Format: YYYY-MM (multiple)
        month: z.string().optional(), // Legacy single month support
        projectIds: z.array(z.string()).optional(), // Multiple projects
        projectId: z.string().optional(), // Legacy single project support
        employeeIds: z.array(z.string()).optional(), // Multiple employees
        employeeId: z.string().optional(), // Legacy single employee support
        sortBy: z.enum(['client', 'project', 'hours', 'budget']).default('client'),
        sortOrder: z.enum(['asc', 'desc']).default('asc'),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const now = new Date()

      // Support both single and multi-select (backwards compatible)
      const selectedMonths = input?.months?.length
        ? input.months
        : input?.month
          ? [input.month]
          : [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`]

      const selectedProjects = input?.projectIds?.length
        ? input.projectIds
        : input?.projectId
          ? [input.projectId]
          : []

      const selectedEmployees = input?.employeeIds?.length
        ? input.employeeIds
        : input?.employeeId
          ? [input.employeeId]
          : []

      // Build date ranges for all selected months
      const dateRanges: { gte: Date; lte: Date }[] = selectedMonths.map(m => {
        const [year, month] = m.split('-').map(Number)
        return {
          gte: new Date(year!, month! - 1, 1),
          lte: new Date(year!, month!, 0, 23, 59, 59),
        }
      })

      // Build where clause for hours
      const hoursWhere: Prisma.HoursEntryWhereInput = {
        OR: dateRanges.map(range => ({
          date: range,
        })),
      }
      if (selectedProjects.length > 0) hoursWhere.projectId = { in: selectedProjects }
      if (selectedEmployees.length > 0) hoursWhere.userId = { in: selectedEmployees }

      // Get all hours for the month grouped by project and service
      const hours = await ctx.db.hoursEntry.findMany({
        where: hoursWhere,
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
              id: true,
              name: true,
              budgetHours: true,
              usedHours: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      // Group by project -> service -> employee
      const projectMap = new Map<string, {
        project: { id: string; name: string; clientName: string | null };
        services: Map<string, {
          service: { id: string; name: string; budgetHours: number | null; usedHours: number };
          employees: Map<string, {
            employee: { id: string; name: string | null; email: string };
            hoursThisMonth: number;
            entries: number;
          }>;
          hoursThisMonth: number;
        }>;
        totalHoursThisMonth: number;
      }>()

      for (const entry of hours) {
        const projectId = entry.project.id
        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, {
            project: entry.project,
            services: new Map(),
            totalHoursThisMonth: 0,
          })
        }
        const projectData = projectMap.get(projectId)!
        projectData.totalHoursThisMonth += entry.hours

        const serviceId = entry.projectService?.id || 'no-service'
        if (!projectData.services.has(serviceId)) {
          projectData.services.set(serviceId, {
            service: entry.projectService || { id: 'no-service', name: 'No dienst', budgetHours: null, usedHours: 0 },
            employees: new Map(),
            hoursThisMonth: 0,
          })
        }
        const serviceData = projectData.services.get(serviceId)!
        serviceData.hoursThisMonth += entry.hours

        const employeeId = entry.user.id
        if (!serviceData.employees.has(employeeId)) {
          serviceData.employees.set(employeeId, {
            employee: entry.user,
            hoursThisMonth: 0,
            entries: 0,
          })
        }
        const employeeData = serviceData.employees.get(employeeId)!
        employeeData.hoursThisMonth += entry.hours
        employeeData.entries += 1
      }

      // Convert to array and sort
      const projects = Array.from(projectMap.values()).map(p => ({
        ...p.project,
        services: Array.from(p.services.values()).map(s => ({
          ...s.service,
          hoursThisMonth: s.hoursThisMonth,
          budgetPercentage: s.service.budgetHours && s.service.budgetHours > 0
            ? Math.round((s.service.usedHours / s.service.budgetHours) * 100)
            : null,
          monthPercentageOfBudget: s.service.budgetHours && s.service.budgetHours > 0
            ? Math.round((s.hoursThisMonth / s.service.budgetHours) * 100)
            : null,
          employees: Array.from(s.employees.values()),
        })),
        totalHoursThisMonth: p.totalHoursThisMonth,
      }))

      // Sort projects
      const sortBy = input?.sortBy || 'client'
      const sortOrder = input?.sortOrder || 'asc'
      projects.sort((a, b) => {
        let cmp = 0
        switch (sortBy) {
          case 'client':
            cmp = (a.clientName || '').localeCompare(b.clientName || '')
            break
          case 'project':
            cmp = a.name.localeCompare(b.name)
            break
          case 'hours':
            cmp = a.totalHoursThisMonth - b.totalHoursThisMonth
            break
          case 'budget':
            const aMax = Math.max(...a.services.map(s => s.budgetPercentage || 0))
            const bMax = Math.max(...b.services.map(s => s.budgetPercentage || 0))
            cmp = aMax - bMax
            break
        }
        return sortOrder === 'desc' ? -cmp : cmp
      })

      return {
        months: selectedMonths,
        month: selectedMonths[0] || '', // Legacy support
        projects,
        totals: {
          hoursThisMonth: hours.reduce((sum, h) => sum + h.hours, 0),
          entriesThisMonth: hours.length,
          projectsWithHours: projects.length,
        },
      }
    }),

  // Get monthly totals for trend
  getMonthlyTotals: publicProcedure
    .input(
      z.object({
        months: z.number().min(1).max(12).default(6),
        projectId: z.string().optional(),
        employeeId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const monthCount = input?.months || 6
      const now = new Date()
      const results: { month: string; hours: number; entries: number }[] = []

      for (let i = 0; i < monthCount; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)

        const where: Prisma.HoursEntryWhereInput = {
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        }
        if (input?.projectId) where.projectId = input.projectId
        if (input?.employeeId) where.userId = input.employeeId

        const [aggregate, count] = await Promise.all([
          ctx.db.hoursEntry.aggregate({
            _sum: { hours: true },
            where,
          }),
          ctx.db.hoursEntry.count({ where }),
        ])

        results.push({
          month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
          hours: aggregate._sum.hours || 0,
          entries: count,
        })
      }

      return results.reverse()
    }),

  // Get all projects for filter dropdown
  getProjectsForFilter: publicProcedure.query(async ({ ctx }) => {
    const projects = await ctx.db.project.findMany({
      select: {
        id: true,
        name: true,
        clientName: true,
      },
      orderBy: [
        { clientName: 'asc' },
        { name: 'asc' },
      ],
    })
    return projects
  }),

  // Get all employees for filter dropdown
  getEmployeesForFilter: publicProcedure.query(async ({ ctx }) => {
    const employees = await ctx.db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    })
    return employees
  }),
})
