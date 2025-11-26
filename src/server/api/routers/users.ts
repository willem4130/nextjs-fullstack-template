import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'

export const usersRouter = createTRPCRouter({
  // Get all users with pagination
  getAll: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        role: z.enum(['ADMIN', 'TEAM_MEMBER']).optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1
      const limit = input?.limit ?? 50
      const skip = (page - 1) * limit

      const where = {
        ...(input?.role ? { role: input.role } : {}),
        ...(input?.search
          ? {
              OR: [
                { name: { contains: input.search, mode: 'insensitive' as const } },
                { email: { contains: input.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      }

      const [users, total] = await Promise.all([
        ctx.db.user.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            createdAt: true,
            simplicateEmployeeId: true,
            // Rate fields
            employeeType: true,
            defaultSalesRate: true,
            defaultCostRate: true,
            salesRateOverride: true,
            costRateOverride: true,
            simplicateEmployeeType: true,
            ratesSyncedAt: true,
            _count: {
              select: {
                contracts: true,
                hoursEntries: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        ctx.db.user.count({ where }),
      ])

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    }),

  // Get user stats
  getStats: publicProcedure.query(async ({ ctx }) => {
    const [totalUsers, adminUsers, teamMembers, recentUsers] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.user.count({ where: { role: 'ADMIN' } }),
      ctx.db.user.count({ where: { role: 'TEAM_MEMBER' } }),
      ctx.db.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30)),
          },
        },
      }),
    ])

    return {
      total: totalUsers,
      admins: adminUsers,
      teamMembers,
      newThisMonth: recentUsers,
    }
  }),

  // Get single user by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        include: {
          contracts: {
            select: {
              id: true,
              status: true,
              templateName: true,
              createdAt: true,
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          hoursEntries: {
            select: {
              id: true,
              hours: true,
              date: true,
              status: true,
            },
            take: 10,
            orderBy: { date: 'desc' },
          },
        },
      })

      if (!user) {
        throw new Error('User not found')
      }

      return user
    }),
})
