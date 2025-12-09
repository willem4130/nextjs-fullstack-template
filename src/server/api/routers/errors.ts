/**
 * Error Monitoring Router
 *
 * Tracks system errors with severity classification, deduplication, and resolution management.
 * Supports acknowledge, dismiss, and resolve workflows with manual intervention.
 */

import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { z } from 'zod'
import { ErrorSeverity, ErrorStatus, WorkflowType } from '@prisma/client'

export const errorsRouter = createTRPCRouter({
  /**
   * Get overview statistics for dashboard card
   */
  getOverview: publicProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Count active errors by severity
    const critical = await ctx.db.errorRecord.count({
      where: { severity: 'CRITICAL', status: 'ACTIVE' },
    })

    const high = await ctx.db.errorRecord.count({
      where: { severity: 'HIGH', status: 'ACTIVE' },
    })

    const medium = await ctx.db.errorRecord.count({
      where: { severity: 'MEDIUM', status: 'ACTIVE' },
    })

    // Calculate error rate (% of workflows failing in last 24h)
    const totalWorkflows = await ctx.db.automationLog.count({
      where: {
        startedAt: { gte: oneDayAgo },
      },
    })

    const failedWorkflows = await ctx.db.automationLog.count({
      where: {
        startedAt: { gte: oneDayAgo },
        status: 'FAILED',
      },
    })

    const errorRate = totalWorkflows > 0 ? (failedWorkflows / totalWorkflows) * 100 : 0

    return {
      critical,
      high,
      medium,
      errorRate: Math.round(errorRate * 10) / 10, // Round to 1 decimal
    }
  }),

  /**
   * Get active errors with filtering and pagination
   */
  getActiveErrors: publicProcedure
    .input(
      z.object({
        severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
        category: z.enum(['WORKFLOW_ERROR', 'INTEGRATION_ERROR', 'DATA_ERROR', 'SYSTEM_ERROR']).optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereClause: any = {
        status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
      }

      if (input.severity) {
        whereClause.severity = input.severity
      }

      if (input.category) {
        whereClause.category = input.category
      }

      const [errors, total] = await Promise.all([
        ctx.db.errorRecord.findMany({
          where: whereClause,
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            automationLog: {
              select: {
                id: true,
                workflowType: true,
              },
            },
            queueItem: {
              select: {
                id: true,
                workflowType: true,
              },
            },
          },
          orderBy: [{ severity: 'asc' }, { lastOccurrence: 'desc' }],
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.db.errorRecord.count({ where: whereClause }),
      ])

      return {
        errors,
        total,
        page: input.page,
        limit: input.limit,
        hasMore: input.page * input.limit < total,
      }
    }),

  /**
   * Get error history (resolved, dismissed, auto-resolved)
   */
  getErrorHistory: publicProcedure
    .input(
      z.object({
        status: z.enum(['RESOLVED', 'DISMISSED', 'AUTO_RESOLVED']).optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereClause: any = {
        status: input.status ? input.status : { in: ['RESOLVED', 'DISMISSED', 'AUTO_RESOLVED'] },
      }

      const [errors, total] = await Promise.all([
        ctx.db.errorRecord.findMany({
          where: whereClause,
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { resolvedAt: 'desc' },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.db.errorRecord.count({ where: whereClause }),
      ])

      return {
        errors,
        total,
        page: input.page,
        limit: input.limit,
        hasMore: input.page * input.limit < total,
      }
    }),

  /**
   * Get error analytics (trends, patterns, most common errors)
   */
  getAnalytics: publicProcedure
    .input(
      z.object({
        days: z.number().default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const startDate = new Date(now.getTime() - input.days * 24 * 60 * 60 * 1000)

      // Get all errors in period
      const errors = await ctx.db.errorRecord.findMany({
        where: {
          firstOccurrence: { gte: startDate },
        },
        select: {
          errorType: true,
          severity: true,
          category: true,
          occurrenceCount: true,
          firstOccurrence: true,
          lastOccurrence: true,
        },
      })

      // Group by error type (most common)
      const errorTypeCounts = errors.reduce((acc, error) => {
        if (!acc[error.errorType]) {
          acc[error.errorType] = {
            errorType: error.errorType,
            count: 0,
            totalOccurrences: 0,
            severity: error.severity,
            category: error.category,
          }
        }
        acc[error.errorType].count++
        acc[error.errorType].totalOccurrences += error.occurrenceCount
        return acc
      }, {} as Record<string, any>)

      const topErrors = Object.values(errorTypeCounts)
        .sort((a: any, b: any) => b.totalOccurrences - a.totalOccurrences)
        .slice(0, 10)

      // Group by category
      const categoryBreakdown = errors.reduce((acc, error) => {
        const key = error.category
        if (!acc[key]) {
          acc[key] = 0
        }
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Group by severity
      const severityBreakdown = errors.reduce((acc, error) => {
        const key = error.severity
        if (!acc[key]) {
          acc[key] = 0
        }
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        topErrors,
        categoryBreakdown,
        severityBreakdown,
        totalErrors: errors.length,
        totalOccurrences: errors.reduce((sum, e) => sum + e.occurrenceCount, 0),
      }
    }),

  /**
   * Get error details by ID
   */
  getErrorById: publicProcedure
    .input(z.object({ errorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const error = await ctx.db.errorRecord.findUnique({
        where: { id: input.errorId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          automationLog: {
            select: {
              id: true,
              workflowType: true,
              startedAt: true,
              completedAt: true,
              metadata: true,
            },
          },
          queueItem: {
            select: {
              id: true,
              workflowType: true,
              payload: true,
              attempts: true,
              maxAttempts: true,
            },
          },
        },
      })

      if (!error) {
        throw new Error('Error not found')
      }

      return error
    }),

  /**
   * Acknowledge error (mark as being investigated)
   */
  acknowledgeError: publicProcedure
    .input(
      z.object({
        errorId: z.string(),
        acknowledgedBy: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const error = await ctx.db.errorRecord.update({
        where: { id: input.errorId },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedBy: input.acknowledgedBy,
          acknowledgedAt: new Date(),
        },
      })

      return error
    }),

  /**
   * Dismiss error (intentionally ignore - false positive or known issue)
   */
  dismissError: publicProcedure
    .input(
      z.object({
        errorId: z.string(),
        reason: z.string(),
        dismissedBy: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const error = await ctx.db.errorRecord.update({
        where: { id: input.errorId },
        data: {
          status: 'DISMISSED',
          resolutionNotes: input.reason,
          resolvedBy: input.dismissedBy,
          resolvedAt: new Date(),
        },
      })

      return error
    }),

  /**
   * Resolve error (manually fixed)
   */
  resolveError: publicProcedure
    .input(
      z.object({
        errorId: z.string(),
        resolutionNotes: z.string(),
        resolvedBy: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const error = await ctx.db.errorRecord.update({
        where: { id: input.errorId },
        data: {
          status: 'RESOLVED',
          resolutionNotes: input.resolutionNotes,
          resolvedBy: input.resolvedBy,
          resolvedAt: new Date(),
        },
      })

      return error
    }),

  /**
   * Retry failed workflow
   */
  retryFailedWorkflow: publicProcedure
    .input(
      z.object({
        queueItemId: z.string(),
        priority: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the failed queue item
      const failedItem = await ctx.db.workflowQueue.findUnique({
        where: { id: input.queueItemId },
      })

      if (!failedItem) {
        throw new Error('Queue item not found')
      }

      // Create new queue item with reset attempts
      const newQueueItem = await ctx.db.workflowQueue.create({
        data: {
          workflowType: failedItem.workflowType,
          projectId: failedItem.projectId || null,
          userId: failedItem.userId || null,
          payload: failedItem.payload as any,
          status: 'PENDING',
          attempts: 0,
          maxAttempts: failedItem.maxAttempts,
          scheduledFor: input.priority ? new Date() : new Date(Date.now() + 60 * 1000), // Now or +1 minute
        },
      })

      return newQueueItem
    }),
})
