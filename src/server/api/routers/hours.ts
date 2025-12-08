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
        sortBy: z.enum(['client', 'project', 'hours', 'budget', 'revenue', 'margin']).default('client'),
        sortOrder: z.enum(['asc', 'desc']).default('asc'),
        billableOnly: z.boolean().optional(),
        marginThreshold: z.enum(['all', 'healthy', 'warning', 'critical']).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Support both single and multi-select (backwards compatible)
      // Empty array means "all time" (no date filter)
      const selectedMonths = input?.months !== undefined
        ? input.months // Use exactly what was passed (can be empty array)
        : input?.month
          ? [input.month]
          : [] // Default to all time when no input

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

      // Build where clause for hours
      const hoursWhere: Prisma.HoursEntryWhereInput = {}

      // Only apply date filter if specific months are selected
      if (selectedMonths.length > 0) {
        const dateRanges = selectedMonths.map(m => {
          const [year, month] = m.split('-').map(Number)
          return {
            gte: new Date(year!, month! - 1, 1),
            lte: new Date(year!, month!, 0, 23, 59, 59),
          }
        })
        hoursWhere.OR = dateRanges.map(range => ({
          date: range,
        }))
      }
      // If selectedMonths is empty, no date filter = all time

      if (selectedProjects.length > 0) hoursWhere.projectId = { in: selectedProjects }
      if (selectedEmployees.length > 0) hoursWhere.userId = { in: selectedEmployees }
      if (input?.billableOnly) hoursWhere.billable = true

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

      // Build where clause for mileage (same filters as hours but for Expense model)
      const mileageWhere: Prisma.ExpenseWhereInput = {
        category: 'KILOMETERS',
      }

      // Apply same date filter as hours
      if (selectedMonths.length > 0) {
        const dateRanges = selectedMonths.map(m => {
          const [year, month] = m.split('-').map(Number)
          return {
            gte: new Date(year!, month! - 1, 1),
            lte: new Date(year!, month!, 0, 23, 59, 59),
          }
        })
        mileageWhere.OR = dateRanges.map(range => ({
          date: range,
        }))
      }

      if (selectedProjects.length > 0) mileageWhere.projectId = { in: selectedProjects }
      if (selectedEmployees.length > 0) mileageWhere.userId = { in: selectedEmployees }

      // Get mileage data with same filters as hours
      const mileage = await ctx.db.expense.findMany({
        where: mileageWhere,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              clientName: true,
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
            totalRevenue: number;
            totalCost: number;
            totalMargin: number;
            rateSource: string | null;
            totalKilometers: number;
            kmCost: number;
            trips: number;
          }>;
          hoursThisMonth: number;
          totalRevenue: number;
          totalCost: number;
          totalMargin: number;
        }>;
        totalHoursThisMonth: number;
        totalRevenue: number;
        totalCost: number;
        totalMargin: number;
      }>()

      for (const entry of hours) {
        const projectId = entry.project.id
        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, {
            project: entry.project,
            services: new Map(),
            totalHoursThisMonth: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalMargin: 0,
          })
        }
        const projectData = projectMap.get(projectId)!
        projectData.totalHoursThisMonth += entry.hours
        projectData.totalRevenue += entry.revenue || 0
        projectData.totalCost += entry.cost || 0
        projectData.totalMargin += entry.margin || 0

        const serviceId = entry.projectService?.id || 'no-service'
        if (!projectData.services.has(serviceId)) {
          projectData.services.set(serviceId, {
            service: entry.projectService || { id: 'no-service', name: 'No dienst', budgetHours: null, usedHours: 0 },
            employees: new Map(),
            hoursThisMonth: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalMargin: 0,
          })
        }
        const serviceData = projectData.services.get(serviceId)!
        serviceData.hoursThisMonth += entry.hours
        serviceData.totalRevenue += entry.revenue || 0
        serviceData.totalCost += entry.cost || 0
        serviceData.totalMargin += entry.margin || 0

        const employeeId = entry.user.id
        if (!serviceData.employees.has(employeeId)) {
          serviceData.employees.set(employeeId, {
            employee: entry.user,
            hoursThisMonth: 0,
            entries: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalMargin: 0,
            rateSource: null,
            totalKilometers: 0,
            kmCost: 0,
            trips: 0,
          })
        }
        const employeeData = serviceData.employees.get(employeeId)!
        employeeData.hoursThisMonth += entry.hours
        employeeData.entries += 1
        employeeData.totalRevenue += entry.revenue || 0
        employeeData.totalCost += entry.cost || 0
        employeeData.totalMargin += entry.margin || 0
        if (entry.rateSource) {
          employeeData.rateSource = entry.rateSource
        }
      }

      // Aggregate mileage data
      for (const expense of mileage) {
        const projectId = expense.project.id
        if (!projectMap.has(projectId)) continue

        const projectData = projectMap.get(projectId)!
        projectData.totalCost += expense.amount || 0
        projectData.totalMargin = projectData.totalRevenue - projectData.totalCost

        const serviceId = 'no-service' // Mileage not linked to services initially
        if (!projectData.services.has(serviceId)) {
          projectData.services.set(serviceId, {
            service: { id: 'no-service', name: 'No dienst', budgetHours: null, usedHours: 0 },
            employees: new Map(),
            hoursThisMonth: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalMargin: 0,
          })
        }
        const serviceData = projectData.services.get(serviceId)!
        serviceData.totalCost += expense.amount || 0
        serviceData.totalMargin = serviceData.totalRevenue - serviceData.totalCost

        const employeeId = expense.user.id
        if (!serviceData.employees.has(employeeId)) {
          serviceData.employees.set(employeeId, {
            employee: expense.user,
            hoursThisMonth: 0,
            entries: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalMargin: 0,
            rateSource: null,
            totalKilometers: 0,
            kmCost: 0,
            trips: 0,
          })
        }

        const employeeData = serviceData.employees.get(employeeId)!
        employeeData.totalKilometers += expense.kilometers || 0
        employeeData.kmCost += expense.amount || 0
        employeeData.trips += 1
        employeeData.totalCost += expense.amount || 0
        employeeData.totalMargin = employeeData.totalRevenue - employeeData.totalCost
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
          totalRevenue: s.totalRevenue,
          totalCost: s.totalCost,
          totalMargin: s.totalMargin,
          marginPercentage: s.totalRevenue > 0
            ? (s.totalMargin / s.totalRevenue) * 100
            : 0,
          employees: Array.from(s.employees.values()).map(e => ({
            ...e,
            avgRate: e.hoursThisMonth > 0 ? e.totalRevenue / e.hoursThisMonth : 0,
            marginPercentage: e.totalRevenue > 0
              ? (e.totalMargin / e.totalRevenue) * 100
              : 0,
          })),
        })),
        totalHoursThisMonth: p.totalHoursThisMonth,
        totalRevenue: p.totalRevenue,
        totalCost: p.totalCost,
        totalMargin: p.totalMargin,
        marginPercentage: p.totalRevenue > 0
          ? (p.totalMargin / p.totalRevenue) * 100
          : 0,
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
          case 'revenue':
            cmp = a.totalRevenue - b.totalRevenue
            break
          case 'margin':
            cmp = a.totalMargin - b.totalMargin
            break
        }
        return sortOrder === 'desc' ? -cmp : cmp
      })

      // Apply margin threshold filter
      let filteredProjects = projects
      if (input?.marginThreshold && input.marginThreshold !== 'all') {
        filteredProjects = projects.filter(p => {
          const margin = p.marginPercentage
          switch (input.marginThreshold) {
            case 'healthy': return margin >= 40
            case 'warning': return margin >= 25 && margin < 40
            case 'critical': return margin < 25
            default: return true
          }
        })
      }

      return {
        months: selectedMonths,
        month: selectedMonths[0] || '', // Legacy support
        projects: filteredProjects,
        totals: {
          hoursThisMonth: hours.reduce((sum, h) => sum + h.hours, 0),
          entriesThisMonth: hours.length,
          projectsWithHours: filteredProjects.length,
          kilometersThisMonth: mileage.reduce((sum, m) => sum + (m.kilometers || 0), 0),
          tripsThisMonth: mileage.length,
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
