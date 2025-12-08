import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'

export const mileageRouter = createTRPCRouter({
  // Get mileage overview with aggregations
  getOverview: publicProcedure
    .input(
      z.object({
        month: z.string().optional(), // Format: YYYY-MM
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        projectId: z.string().optional(),
        employeeId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Build date range
      let start: Date
      let end: Date

      if (input.month) {
        const [year, month] = input.month.split('-').map(Number)
        start = new Date(year!, month! - 1, 1)
        end = new Date(year!, month!, 0, 23, 59, 59)
      } else if (input.startDate && input.endDate) {
        start = new Date(input.startDate)
        end = new Date(input.endDate)
      } else {
        const now = new Date()
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      }

      // Build where clause
      const where = {
        date: { gte: start, lte: end },
        category: 'KILOMETERS' as const,
        ...(input.projectId && { projectId: input.projectId }),
        ...(input.employeeId && { userId: input.employeeId }),
      }

      // Get total aggregates
      const aggregate = await ctx.db.expense.aggregate({
        where,
        _sum: {
          kilometers: true,
          amount: true,
        },
        _count: true,
      })

      return {
        totalKilometers: aggregate._sum.kilometers ?? 0,
        totalCost: aggregate._sum.amount ?? 0,
        totalTrips: aggregate._count,
        period: { start, end },
      }
    }),

  // Get mileage grouped by project
  getByProject: publicProcedure
    .input(
      z.object({
        month: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Build date range
      let start: Date
      let end: Date

      if (input.month) {
        const [year, month] = input.month.split('-').map(Number)
        start = new Date(year!, month! - 1, 1)
        end = new Date(year!, month!, 0, 23, 59, 59)
      } else if (input.startDate && input.endDate) {
        start = new Date(input.startDate)
        end = new Date(input.endDate)
      } else {
        const now = new Date()
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      }

      // Get mileage grouped by project
      const mileageByProject = await ctx.db.expense.groupBy({
        by: ['projectId'],
        where: {
          date: { gte: start, lte: end },
          category: 'KILOMETERS',
        },
        _sum: {
          kilometers: true,
          amount: true,
        },
        _count: true,
      })

      // Get project details
      const projectIds = mileageByProject
        .map((m) => m.projectId)
        .filter((id): id is string => id !== null)

      const projects = await ctx.db.project.findMany({
        where: { id: { in: projectIds } },
        select: {
          id: true,
          simplicateId: true,
          name: true,
          projectNumber: true,
        },
      })

      const projectMap = new Map(projects.map((p) => [p.id, p]))

      return mileageByProject
        .filter((m) => m.projectId !== null)
        .map((m) => {
          const project = projectMap.get(m.projectId!)
          return {
            projectId: m.projectId!,
            projectName: project?.name ?? 'Unknown Project',
            projectNumber: project?.projectNumber ?? '',
            simplicateId: project?.simplicateId ?? '',
            totalKilometers: m._sum?.kilometers ?? 0,
            totalCost: m._sum?.amount ?? 0,
            trips: m._count as number,
          }
        })
        .sort((a, b) => b.totalKilometers - a.totalKilometers)
    }),

  // Get mileage grouped by employee
  getByEmployee: publicProcedure
    .input(
      z.object({
        month: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Build date range
      let start: Date
      let end: Date

      if (input.month) {
        const [year, month] = input.month.split('-').map(Number)
        start = new Date(year!, month! - 1, 1)
        end = new Date(year!, month!, 0, 23, 59, 59)
      } else if (input.startDate && input.endDate) {
        start = new Date(input.startDate)
        end = new Date(input.endDate)
      } else {
        const now = new Date()
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      }

      // Get mileage grouped by employee
      const mileageByEmployee = await ctx.db.expense.groupBy({
        by: ['userId'],
        where: {
          date: { gte: start, lte: end },
          category: 'KILOMETERS',
        },
        _sum: {
          kilometers: true,
          amount: true,
        },
        _count: true,
      })

      // Get employee details
      const employeeIds = mileageByEmployee
        .map((m) => m.userId)
        .filter((id): id is string => id !== null)

      const employees = await ctx.db.user.findMany({
        where: { id: { in: employeeIds } },
        select: {
          id: true,
          simplicateEmployeeId: true,
          name: true,
          email: true,
        },
      })

      const employeeMap = new Map(employees.map((e) => [e.id, e]))

      return mileageByEmployee
        .filter((m) => m.userId !== null)
        .map((m) => {
          const employee = employeeMap.get(m.userId!)
          return {
            employeeId: m.userId!,
            employeeName: employee?.name ?? 'Unknown Employee',
            employeeEmail: employee?.email ?? '',
            simplicateId: employee?.simplicateEmployeeId ?? '',
            totalKilometers: m._sum?.kilometers ?? 0,
            totalCost: m._sum?.amount ?? 0,
            trips: m._count as number,
          }
        })
        .sort((a, b) => b.totalKilometers - a.totalKilometers)
    }),

  // Get detailed mileage entries
  getEntries: publicProcedure
    .input(
      z.object({
        month: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        projectId: z.string().optional(),
        employeeId: z.string().optional(),
        limit: z.number().min(1).max(500).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Build date range
      let start: Date
      let end: Date

      if (input.month) {
        const [year, month] = input.month.split('-').map(Number)
        start = new Date(year!, month! - 1, 1)
        end = new Date(year!, month!, 0, 23, 59, 59)
      } else if (input.startDate && input.endDate) {
        start = new Date(input.startDate)
        end = new Date(input.endDate)
      } else {
        const now = new Date()
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      }

      // Build where clause
      const where = {
        date: { gte: start, lte: end },
        category: 'KILOMETERS' as const,
        ...(input.projectId && { projectId: input.projectId }),
        ...(input.employeeId && { userId: input.employeeId }),
      }

      // Get entries
      const entries = await ctx.db.expense.findMany({
        where,
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
              projectNumber: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        take: input.limit,
        skip: input.offset,
      })

      // Get total count
      const total = await ctx.db.expense.count({ where })

      return {
        entries: entries.map((entry) => ({
          id: entry.id,
          date: entry.date,
          kilometers: entry.kilometers ?? 0,
          cost: entry.amount,
          description: entry.description,
          employee: {
            id: entry.user?.id ?? '',
            name: entry.user?.name ?? 'Unknown',
            email: entry.user?.email ?? '',
          },
          project: entry.project
            ? {
                id: entry.project.id,
                name: entry.project.name,
                projectNumber: entry.project.projectNumber,
              }
            : null,
        })),
        total,
        hasMore: input.offset + input.limit < total,
      }
    }),
})
