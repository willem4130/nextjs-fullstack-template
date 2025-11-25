import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import type { Prisma } from '@prisma/client'

export const invoicesRouter = createTRPCRouter({
  // Get all invoices with filtering
  getAll: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PAID', 'CANCELLED']).optional(),
        projectId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, status, projectId } = input
      const skip = (page - 1) * limit

      const where: Prisma.InvoiceWhereInput = {}
      if (status) where.status = status
      if (projectId) where.projectId = projectId

      const [invoices, total] = await Promise.all([
        ctx.db.invoice.findMany({
          where,
          skip,
          take: limit,
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
            createdAt: 'desc',
          },
        }),
        ctx.db.invoice.count({ where }),
      ])

      return {
        invoices,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    }),

  // Get invoice by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findUnique({
        where: { id: input.id },
        include: {
          project: true,
          hoursEntries: true,
        },
      })

      if (!invoice) {
        throw new Error('Invoice not found')
      }

      return invoice
    }),

  // Get invoice stats
  getStats: publicProcedure.query(async ({ ctx }) => {
    const [total, draft, pendingApproval, approved, sent, paid, cancelled] = await Promise.all([
      ctx.db.invoice.count(),
      ctx.db.invoice.count({ where: { status: 'DRAFT' } }),
      ctx.db.invoice.count({ where: { status: 'PENDING_APPROVAL' } }),
      ctx.db.invoice.count({ where: { status: 'APPROVED' } }),
      ctx.db.invoice.count({ where: { status: 'SENT' } }),
      ctx.db.invoice.count({ where: { status: 'PAID' } }),
      ctx.db.invoice.count({ where: { status: 'CANCELLED' } }),
    ])

    // Get total amount
    const totalAmount = await ctx.db.invoice.aggregate({
      _sum: {
        amount: true,
      },
    })

    // Get paid amount
    const paidAmount = await ctx.db.invoice.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: 'PAID',
      },
    })

    return {
      total,
      draft,
      pendingApproval,
      approved,
      sent,
      paid,
      cancelled,
      totalAmount: totalAmount._sum.amount || 0,
      paidAmount: paidAmount._sum.amount || 0,
    }
  }),
})
