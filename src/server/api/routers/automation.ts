import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'

export const automationRouter = createTRPCRouter({
  // Get automation logs with filtering
  getLogs: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        workflowType: z
          .enum(['CONTRACT_DISTRIBUTION', 'HOURS_REMINDER', 'INVOICE_GENERATION'])
          .optional(),
        status: z.enum(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'RETRYING']).optional(),
        projectId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, workflowType, status, projectId } = input
      const skip = (page - 1) * limit

      const where: any = {}
      if (workflowType) where.workflowType = workflowType
      if (status) where.status = status
      if (projectId) where.projectId = projectId

      const [logs, total] = await Promise.all([
        ctx.db.automationLog.findMany({
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
            startedAt: 'desc',
          },
        }),
        ctx.db.automationLog.count({ where }),
      ])

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    }),

  // Get automation stats
  getStats: publicProcedure.query(async ({ ctx }) => {
    const [
      total,
      success,
      failed,
      running,
      contractDistributions,
      hoursReminders,
      invoiceGenerations,
      recentLogs,
    ] = await Promise.all([
      ctx.db.automationLog.count(),
      ctx.db.automationLog.count({ where: { status: 'SUCCESS' } }),
      ctx.db.automationLog.count({ where: { status: 'FAILED' } }),
      ctx.db.automationLog.count({ where: { status: 'RUNNING' } }),
      ctx.db.automationLog.count({ where: { workflowType: 'CONTRACT_DISTRIBUTION' } }),
      ctx.db.automationLog.count({ where: { workflowType: 'HOURS_REMINDER' } }),
      ctx.db.automationLog.count({ where: { workflowType: 'INVOICE_GENERATION' } }),
      ctx.db.automationLog.findMany({
        take: 5,
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          startedAt: 'desc',
        },
      }),
    ])

    return {
      total,
      success,
      failed,
      running,
      successRate: total > 0 ? (success / total) * 100 : 0,
      byWorkflow: {
        contractDistribution: contractDistributions,
        hoursReminder: hoursReminders,
        invoiceGeneration: invoiceGenerations,
      },
      recentLogs,
    }
  }),

  // Get recent activity
  getRecentActivity: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const logs = await ctx.db.automationLog.findMany({
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
          startedAt: 'desc',
        },
      })

      return logs
    }),

  // Get workflow queue items
  getQueue: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, status } = input
      const skip = (page - 1) * limit

      const where: any = {}
      if (status) where.status = status

      const [items, total] = await Promise.all([
        ctx.db.workflowQueue.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        ctx.db.workflowQueue.count({ where }),
      ])

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    }),

  // Get queue statistics
  getQueueStats: publicProcedure.query(async ({ ctx }) => {
    const [pending, processing, completed, failed] = await Promise.all([
      ctx.db.workflowQueue.count({ where: { status: 'PENDING' } }),
      ctx.db.workflowQueue.count({ where: { status: 'PROCESSING' } }),
      ctx.db.workflowQueue.count({ where: { status: 'COMPLETED' } }),
      ctx.db.workflowQueue.count({ where: { status: 'FAILED' } }),
    ])

    return { pending, processing, completed, failed, total: pending + processing + completed + failed }
  }),

  // Manually trigger queue processing
  processQueueNow: publicProcedure.mutation(async ({ ctx }) => {
    // Fetch pending items
    const pendingItems = await ctx.db.workflowQueue.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: new Date() },
      },
      take: 5,
    })

    return {
      message: `Found ${pendingItems.length} items to process. Visit /api/cron/process-queue to trigger processing.`,
      pendingCount: pendingItems.length,
    }
  }),

  // Add test item to queue (for testing)
  addTestQueueItem: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        workflowType: z.enum(['CONTRACT_DISTRIBUTION', 'HOURS_REMINDER', 'INVOICE_GENERATION']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.workflowQueue.create({
        data: {
          workflowType: input.workflowType,
          projectId: input.projectId,
          payload: { test: true, createdAt: new Date().toISOString() },
          status: 'PENDING',
          scheduledFor: new Date(),
        },
      })

      return { id: item.id, message: 'Test item added to queue' }
    }),
})
