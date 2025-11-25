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
})
