/**
 * Timeliness Tracking Router
 *
 * Monitors administrative health: pending hours, unsigned contracts, overdue invoices, stuck workflows.
 * Prioritizes issues by age/severity: critical (>14 days), warning (>7 days), normal (>3 days)
 */

import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { z } from 'zod'
import { startOfMonth, endOfMonth, subMonths, format, differenceInDays } from 'date-fns'

export const timelinessRouter = createTRPCRouter({
  /**
   * Get overview statistics for dashboard card
   */
  getOverview: publicProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const lastCompleteMonth = subMonths(startOfMonth(now), 1)
    const lastCompleteMonthEnd = endOfMonth(lastCompleteMonth)

    // Count users with pending hours (last complete month)
    const activeMembers = await ctx.db.projectMember.findMany({
      where: {
        leftAt: null,
        project: { status: 'ACTIVE' },
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    })

    let pendingHoursUsers = 0
    for (const member of activeMembers) {
      const hoursCount = await ctx.db.hoursEntry.count({
        where: {
          userId: member.userId,
          date: {
            gte: startOfMonth(lastCompleteMonth),
            lte: lastCompleteMonthEnd,
          },
        },
      })
      if (hoursCount === 0) {
        pendingHoursUsers++
      }
    }

    // Count unsigned contracts (>7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const unsignedContracts = await ctx.db.contract.count({
      where: {
        status: 'SENT',
        sentAt: { lt: sevenDaysAgo },
      },
    })

    // Count overdue invoices
    const overdueInvoices = await ctx.db.invoice.count({
      where: {
        status: 'SENT',
        dueDate: { lt: now },
      },
    })

    // Count stuck workflows (PENDING >1 hour, PROCESSING >30min, or FAILED)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000)

    const stuckWorkflows = await ctx.db.workflowQueue.count({
      where: {
        OR: [
          { status: 'PENDING', scheduledFor: { lt: oneHourAgo } },
          { status: 'PROCESSING', startedAt: { lt: thirtyMinAgo } },
          { status: 'FAILED' },
        ],
      },
    })

    // Critical alerts = sum of all critical priority issues
    // For now, estimate: contracts >21 days, invoices >30 days, hours >14 days
    const criticalHoursDate = new Date(lastCompleteMonthEnd.getTime() + 14 * 24 * 60 * 60 * 1000)
    const criticalHoursCount = now > criticalHoursDate ? pendingHoursUsers : 0

    const twentyOneDaysAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000)
    const criticalContracts = await ctx.db.contract.count({
      where: {
        status: 'SENT',
        sentAt: { lt: twentyOneDaysAgo },
      },
    })

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const criticalInvoices = await ctx.db.invoice.count({
      where: {
        status: 'SENT',
        dueDate: { lt: thirtyDaysAgo },
      },
    })

    const criticalAlerts = criticalHoursCount + criticalContracts + criticalInvoices + stuckWorkflows

    // Calculate average hours lag (days since last complete month end)
    const daysSinceMonthEnd = differenceInDays(now, lastCompleteMonthEnd)

    return {
      criticalAlerts,
      pendingHoursUsers,
      unsignedContracts,
      overdueInvoices,
      stuckWorkflows,
      avgHoursLag: daysSinceMonthEnd,
    }
  }),

  /**
   * Get users with pending hours submissions
   */
  getPendingHours: publicProcedure
    .input(
      z.object({
        priority: z.enum(['all', 'critical', 'warning', 'normal']).optional(),
        month: z.string().optional(), // "2025-11"
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date()
      let targetMonth: Date

      if (input.month) {
        const parts = input.month.split('-')
        const year = parseInt(parts[0] || '0', 10)
        const month = parseInt(parts[1] || '0', 10)
        targetMonth = new Date(year, month - 1, 1)
      } else {
        // Default to last complete month
        targetMonth = subMonths(startOfMonth(now), 1)
      }

      const periodStart = startOfMonth(targetMonth)
      const periodEnd = endOfMonth(targetMonth)

      // Get active project members
      const activeMembers = await ctx.db.projectMember.findMany({
        where: {
          leftAt: null,
          project: { status: 'ACTIVE' },
        },
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
            },
          },
        },
      })

      // Group by user
      const userMap = new Map<
        string,
        {
          userId: string
          userName: string | null
          userEmail: string
          projects: Array<{ id: string; name: string }>
          lastSubmission: Date | null
          totalHours: number
        }
      >()

      for (const member of activeMembers) {
        if (!member.user.email) continue

        const existing = userMap.get(member.userId)
        if (existing) {
          existing.projects.push({ id: member.project.id, name: member.project.name })
        } else {
          // Get latest hours submission for this user in the period
          const latestHours = await ctx.db.hoursEntry.findFirst({
            where: {
              userId: member.userId,
              date: {
                gte: periodStart,
                lte: periodEnd,
              },
            },
            orderBy: { date: 'desc' },
          })

          // Get total hours for this user in the period
          const hoursAgg = await ctx.db.hoursEntry.aggregate({
            where: {
              userId: member.userId,
              date: {
                gte: periodStart,
                lte: periodEnd,
              },
            },
            _sum: { hours: true },
          })

          userMap.set(member.userId, {
            userId: member.userId,
            userName: member.user.name,
            userEmail: member.user.email,
            projects: [{ id: member.project.id, name: member.project.name }],
            lastSubmission: latestHours?.date || null,
            totalHours: hoursAgg._sum.hours || 0,
          })
        }
      }

      // Filter users with no or insufficient hours
      const pendingUsers = Array.from(userMap.values())
        .filter((user) => user.totalHours < 1) // Less than 1 hour logged
        .map((user) => {
          // Calculate days late (days since period end + 3 day grace period)
          const graceDeadline = new Date(periodEnd.getTime() + 3 * 24 * 60 * 60 * 1000)
          const daysLate = Math.max(0, differenceInDays(now, graceDeadline))

          // Determine priority
          let priority: 'critical' | 'warning' | 'normal'
          if (daysLate > 14) {
            priority = 'critical'
          } else if (daysLate > 7) {
            priority = 'warning'
          } else {
            priority = 'normal'
          }

          return {
            ...user,
            daysLate,
            priority,
          }
        })

      // Filter by priority if specified
      const filtered =
        input.priority && input.priority !== 'all'
          ? pendingUsers.filter((u) => u.priority === input.priority)
          : pendingUsers

      // Sort by daysLate descending (most urgent first)
      filtered.sort((a, b) => b.daysLate - a.daysLate)

      // Pagination
      const start = (input.page - 1) * input.limit
      const end = start + input.limit
      const paginated = filtered.slice(start, end)

      return {
        users: paginated,
        total: filtered.length,
        page: input.page,
        limit: input.limit,
        hasMore: end < filtered.length,
      }
    }),

  /**
   * Get unsigned contracts
   */
  getUnsignedContracts: publicProcedure
    .input(
      z.object({
        priority: z.enum(['all', 'critical', 'warning', 'normal']).optional(),
        daysMin: z.number().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date()

      const contracts = await ctx.db.contract.findMany({
        where: {
          status: 'SENT',
        },
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
            },
          },
        },
        orderBy: { sentAt: 'asc' },
      })

      const contractsWithPriority = contracts
        .filter((c) => c.sentAt !== null)
        .map((contract) => {
          const daysUnsigned = differenceInDays(now, contract.sentAt!)

          // Determine priority
          let priority: 'critical' | 'warning' | 'normal'
          if (daysUnsigned > 21) {
            priority = 'critical'
          } else if (daysUnsigned > 7) {
            priority = 'warning'
          } else {
            priority = 'normal'
          }

          return {
            id: contract.id,
            user: contract.user,
            project: contract.project,
            sentAt: contract.sentAt!,
            daysUnsigned,
            priority,
            templateName: contract.templateName,
          }
        })

      // Filter by priority and daysMin
      let filtered = contractsWithPriority

      if (input.priority && input.priority !== 'all') {
        filtered = filtered.filter((c) => c.priority === input.priority)
      }

      if (input.daysMin !== undefined) {
        filtered = filtered.filter((c) => c.daysUnsigned >= (input.daysMin || 0))
      }

      // Sort by daysUnsigned descending
      filtered.sort((a, b) => b.daysUnsigned - a.daysUnsigned)

      // Pagination
      const start = (input.page - 1) * input.limit
      const end = start + input.limit
      const paginated = filtered.slice(start, end)

      return {
        contracts: paginated,
        total: filtered.length,
        page: input.page,
        limit: input.limit,
        hasMore: end < filtered.length,
      }
    }),

  /**
   * Get overdue invoices
   */
  getOverdueInvoices: publicProcedure
    .input(
      z.object({
        priority: z.enum(['all', 'critical', 'warning', 'normal']).optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date()

      const invoices = await ctx.db.invoice.findMany({
        where: {
          status: 'SENT',
          dueDate: { lt: now },
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              clientName: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      })

      const invoicesWithPriority = invoices.map((invoice) => {
        const daysOverdue = differenceInDays(now, invoice.dueDate!)

        // Determine priority
        let priority: 'critical' | 'warning' | 'normal'
        if (daysOverdue > 30) {
          priority = 'critical'
        } else if (daysOverdue > 14) {
          priority = 'warning'
        } else {
          priority = 'normal'
        }

        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          project: invoice.project,
          amount: invoice.amount,
          dueDate: invoice.dueDate!,
          daysOverdue,
          priority,
        }
      })

      // Filter by priority
      const filtered =
        input.priority && input.priority !== 'all'
          ? invoicesWithPriority.filter((inv) => inv.priority === input.priority)
          : invoicesWithPriority

      // Pagination
      const start = (input.page - 1) * input.limit
      const end = start + input.limit
      const paginated = filtered.slice(start, end)

      return {
        invoices: paginated,
        total: filtered.length,
        page: input.page,
        limit: input.limit,
        hasMore: end < filtered.length,
      }
    }),

  /**
   * Get stuck workflow queue items
   */
  getStuckWorkflows: publicProcedure
    .input(
      z.object({
        workflowType: z.enum(['CONTRACT_DISTRIBUTION', 'HOURS_REMINDER', 'INVOICE_GENERATION']).optional(),
        status: z.enum(['PENDING', 'PROCESSING', 'FAILED']).optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000)

      // Build where clause for stuck workflows
      const whereClause: any = {
        OR: [
          { status: 'PENDING', scheduledFor: { lt: oneHourAgo } },
          { status: 'PROCESSING', startedAt: { lt: thirtyMinAgo } },
          { status: 'FAILED' },
        ],
      }

      if (input.workflowType) {
        whereClause.workflowType = input.workflowType
      }

      if (input.status) {
        // Override OR clause if specific status requested
        delete whereClause.OR
        whereClause.status = input.status
      }

      const workflows = await ctx.db.workflowQueue.findMany({
        where: whereClause,
        include: {
          errorRecords: {
            where: { status: 'ACTIVE' },
            take: 1,
            orderBy: { lastOccurrence: 'desc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      })

      const workflowsWithDuration = workflows.map((workflow) => {
        let stuckDuration = 0
        if (workflow.status === 'PENDING' && workflow.scheduledFor) {
          stuckDuration = differenceInDays(now, workflow.scheduledFor)
        } else if (workflow.status === 'PROCESSING' && workflow.startedAt) {
          stuckDuration = differenceInDays(now, workflow.startedAt)
        } else if (workflow.status === 'FAILED' && workflow.completedAt) {
          stuckDuration = differenceInDays(now, workflow.completedAt)
        }

        return {
          id: workflow.id,
          workflowType: workflow.workflowType,
          status: workflow.status,
          scheduledFor: workflow.scheduledFor,
          startedAt: workflow.startedAt,
          attempts: workflow.attempts,
          maxAttempts: workflow.maxAttempts,
          error: workflow.error,
          stuckDuration,
          hasActiveError: workflow.errorRecords.length > 0,
        }
      })

      // Pagination
      const start = (input.page - 1) * input.limit
      const end = start + input.limit
      const paginated = workflowsWithDuration.slice(start, end)

      return {
        workflows: paginated,
        total: workflowsWithDuration.length,
        page: input.page,
        limit: input.limit,
        hasMore: end < workflowsWithDuration.length,
      }
    }),
})
