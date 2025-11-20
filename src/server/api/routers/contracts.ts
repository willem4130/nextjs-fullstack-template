import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'

export const contractsRouter = createTRPCRouter({
  // Get all contracts with filtering
  getAll: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        status: z.enum(['PENDING', 'SENT', 'SIGNED', 'REJECTED', 'EXPIRED']).optional(),
        projectId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, status, projectId } = input
      const skip = (page - 1) * limit

      const where: any = {}
      if (status) where.status = status
      if (projectId) where.projectId = projectId

      const [contracts, total] = await Promise.all([
        ctx.db.contract.findMany({
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
            createdAt: 'desc',
          },
        }),
        ctx.db.contract.count({ where }),
      ])

      return {
        contracts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    }),

  // Get contract by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const contract = await ctx.db.contract.findUnique({
        where: { id: input.id },
        include: {
          user: true,
          project: true,
        },
      })

      if (!contract) {
        throw new Error('Contract not found')
      }

      return contract
    }),

  // Get contract stats
  getStats: publicProcedure.query(async ({ ctx }) => {
    const [total, pending, sent, signed, rejected, expired] = await Promise.all([
      ctx.db.contract.count(),
      ctx.db.contract.count({ where: { status: 'PENDING' } }),
      ctx.db.contract.count({ where: { status: 'SENT' } }),
      ctx.db.contract.count({ where: { status: 'SIGNED' } }),
      ctx.db.contract.count({ where: { status: 'REJECTED' } }),
      ctx.db.contract.count({ where: { status: 'EXPIRED' } }),
    ])

    return {
      total,
      pending,
      sent,
      signed,
      rejected,
      expired,
      signRate: total > 0 ? (signed / total) * 100 : 0,
    }
  }),
})
