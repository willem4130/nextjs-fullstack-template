import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'

export const projectsRouter = createTRPCRouter({
  // Get all projects with pagination
  getAll: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, status } = input
      const skip = (page - 1) * limit

      const where = status ? { status } : {}

      const [projects, total] = await Promise.all([
        ctx.db.project.findMany({
          where,
          skip,
          take: limit,
          include: {
            contracts: {
              select: {
                id: true,
                status: true,
              },
            },
            hoursEntries: {
              select: {
                id: true,
                hours: true,
                status: true,
              },
            },
            invoices: {
              select: {
                id: true,
                amount: true,
                status: true,
              },
            },
            _count: {
              select: {
                contracts: true,
                hoursEntries: true,
                invoices: true,
                automationLogs: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        ctx.db.project.count({ where }),
      ])

      return {
        projects,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    }),

  // Get single project by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.id },
        include: {
          contracts: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          hoursEntries: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          invoices: true,
          automationLogs: {
            orderBy: {
              startedAt: 'desc',
            },
            take: 10,
          },
        },
      })

      if (!project) {
        throw new Error('Project not found')
      }

      return project
    }),

  // Get project stats
  getStats: publicProcedure.query(async ({ ctx }) => {
    const [
      totalProjects,
      activeProjects,
      completedProjects,
      totalContracts,
      signedContracts,
      totalHours,
      approvedHours,
      totalInvoices,
      paidInvoices,
    ] = await Promise.all([
      ctx.db.project.count(),
      ctx.db.project.count({ where: { status: 'ACTIVE' } }),
      ctx.db.project.count({ where: { status: 'COMPLETED' } }),
      ctx.db.contract.count(),
      ctx.db.contract.count({ where: { status: 'SIGNED' } }),
      ctx.db.hoursEntry.aggregate({ _sum: { hours: true } }),
      ctx.db.hoursEntry.aggregate({
        _sum: { hours: true },
        where: { status: 'APPROVED' },
      }),
      ctx.db.invoice.count(),
      ctx.db.invoice.count({ where: { status: 'PAID' } }),
    ])

    return {
      projects: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
      },
      contracts: {
        total: totalContracts,
        signed: signedContracts,
        pending: totalContracts - signedContracts,
      },
      hours: {
        total: totalHours._sum.hours ?? 0,
        approved: approvedHours._sum.hours ?? 0,
      },
      invoices: {
        total: totalInvoices,
        paid: paidInvoices,
        pending: totalInvoices - paidInvoices,
      },
    }
  }),
})
