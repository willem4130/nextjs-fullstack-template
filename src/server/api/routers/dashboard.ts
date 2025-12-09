import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { startOfMonth, subMonths } from 'date-fns'

export const dashboardRouter = createTRPCRouter({
  // Get dashboard overview stats
  getOverview: publicProcedure.query(async ({ ctx }) => {
    const [
      projectStats,
      contractStats,
      hoursStats,
      invoiceStats,
      mileageStats,
      automationStats,
      recentProjects,
      recentAutomations,
    ] = await Promise.all([
      // Project stats
      Promise.all([
        ctx.db.project.count(),
        ctx.db.project.count({ where: { status: 'ACTIVE' } }),
        ctx.db.project.count({ where: { status: 'COMPLETED' } }),
      ]),
      // Contract stats
      Promise.all([
        ctx.db.contract.count(),
        ctx.db.contract.count({ where: { status: 'PENDING' } }),
        ctx.db.contract.count({ where: { status: 'SIGNED' } }),
      ]),
      // Hours stats
      Promise.all([
        ctx.db.hoursEntry.aggregate({ _sum: { hours: true } }),
        ctx.db.hoursEntry.count({ where: { status: 'PENDING' } }),
        ctx.db.hoursEntry.count({ where: { status: 'APPROVED' } }),
      ]),
      // Invoice stats
      Promise.all([
        ctx.db.invoice.aggregate({ _sum: { amount: true } }),
        ctx.db.invoice.count({ where: { status: 'DRAFT' } }),
        ctx.db.invoice.count({ where: { status: 'PAID' } }),
      ]),
      // Mileage stats
      Promise.all([
        ctx.db.expense.aggregate({
          where: { category: 'KILOMETERS' },
          _sum: { kilometers: true, amount: true }
        }),
        ctx.db.expense.count({ where: { category: 'KILOMETERS' } }),
      ]),
      // Automation stats
      Promise.all([
        ctx.db.automationLog.count(),
        ctx.db.automationLog.count({ where: { status: 'SUCCESS' } }),
        ctx.db.automationLog.count({ where: { status: 'FAILED' } }),
      ]),
      // Recent projects
      ctx.db.project.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              contracts: true,
              hoursEntries: true,
            },
          },
        },
      }),
      // Recent automations
      ctx.db.automationLog.findMany({
        take: 5,
        orderBy: { startedAt: 'desc' },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ])

    const [totalProjects, activeProjects, completedProjects] = projectStats
    const [totalContracts, pendingContracts, signedContracts] = contractStats
    const [totalHoursAgg, pendingHours, approvedHours] = hoursStats
    const [totalAmountAgg, draftInvoices, paidInvoices] = invoiceStats
    const [mileageAgg, totalMileageEntries] = mileageStats
    const [totalAutomations, successAutomations, failedAutomations] = automationStats

    // Calculate executive dashboard stats
    const now = new Date()
    const currentMonth = startOfMonth(now)
    const previousMonth = subMonths(currentMonth, 1)

    // Margin stats - calculate from current month hours
    const currentMonthHours = await ctx.db.hoursEntry.findMany({
      where: {
        date: { gte: currentMonth },
      },
      select: {
        revenue: true,
        cost: true,
        margin: true,
      },
    })

    const previousMonthHours = await ctx.db.hoursEntry.findMany({
      where: {
        date: {
          gte: previousMonth,
          lt: currentMonth,
        },
      },
      select: {
        revenue: true,
        cost: true,
      },
    })

    const currentRevenue = currentMonthHours.reduce((sum, h) => sum + (h.revenue || 0), 0)
    const currentCost = currentMonthHours.reduce((sum, h) => sum + (h.cost || 0), 0)
    const currentMargin = currentRevenue > 0 ? ((currentRevenue - currentCost) / currentRevenue) * 100 : 0

    const previousRevenue = previousMonthHours.reduce((sum, h) => sum + (h.revenue || 0), 0)
    const previousCost = previousMonthHours.reduce((sum, h) => sum + (h.cost || 0), 0)
    const previousMargin = previousRevenue > 0 ? ((previousRevenue - previousCost) / previousRevenue) * 100 : 0

    // Count projects with low margins (using current month data)
    const projectMargins = await ctx.db.project.findMany({
      where: { status: 'ACTIVE' },
      include: {
        hoursEntries: {
          where: { date: { gte: currentMonth } },
          select: { revenue: true, cost: true },
        },
      },
    })

    const criticalProjects = projectMargins.filter((p) => {
      const projectRevenue = p.hoursEntries.reduce((sum, h) => sum + (h.revenue || 0), 0)
      const projectCost = p.hoursEntries.reduce((sum, h) => sum + (h.cost || 0), 0)
      const projectMargin = projectRevenue > 0 ? ((projectRevenue - projectCost) / projectRevenue) * 100 : 0
      return projectMargin < 25 && projectRevenue > 0
    }).length

    const atRiskProjects = projectMargins.filter((p) => {
      const projectRevenue = p.hoursEntries.reduce((sum, h) => sum + (h.revenue || 0), 0)
      const projectCost = p.hoursEntries.reduce((sum, h) => sum + (h.cost || 0), 0)
      const projectMargin = projectRevenue > 0 ? ((projectRevenue - projectCost) / projectRevenue) * 100 : 0
      return projectMargin >= 25 && projectMargin < 40 && projectRevenue > 0
    })

    const atRiskRevenue = atRiskProjects.reduce((sum, p) => {
      return sum + p.hoursEntries.reduce((s, h) => s + (h.revenue || 0), 0)
    }, 0)

    // Timeliness stats
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastCompleteMonth = subMonths(currentMonth, 1)

    const unsignedContracts = await ctx.db.contract.count({
      where: {
        status: 'SENT',
        sentAt: { lt: sevenDaysAgo },
      },
    })

    const overdueInvoices = await ctx.db.invoice.count({
      where: {
        status: 'SENT',
        dueDate: { lt: now },
      },
    })

    // Count users with pending hours (simplified)
    const activeMembers = await ctx.db.projectMember.findMany({
      where: {
        leftAt: null,
        project: { status: 'ACTIVE' },
      },
      select: { userId: true },
      distinct: ['userId'],
    })

    let pendingHoursUsers = 0
    for (const member of activeMembers) {
      const hoursCount = await ctx.db.hoursEntry.count({
        where: {
          userId: member.userId,
          date: { gte: lastCompleteMonth, lt: currentMonth },
        },
      })
      if (hoursCount === 0) pendingHoursUsers++
    }

    const criticalAlerts = pendingHoursUsers + unsignedContracts + overdueInvoices

    // Error stats
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Error tracking (safe fallback if ErrorRecord table doesn't exist yet)
    let criticalErrors = 0
    let highErrors = 0
    try {
      [criticalErrors, highErrors] = await Promise.all([
        ctx.db.errorRecord.count({
          where: { severity: 'CRITICAL', status: 'ACTIVE' },
        }),
        ctx.db.errorRecord.count({
          where: { severity: 'HIGH', status: 'ACTIVE' },
        }),
      ])
    } catch (error) {
      // ErrorRecord table doesn't exist yet (migration pending)
      console.warn('[Dashboard] ErrorRecord table not available:', error)
    }

    const [totalWorkflows24h, failedWorkflows24h] = await Promise.all([
      ctx.db.automationLog.count({
        where: { startedAt: { gte: oneDayAgo } },
      }),
      ctx.db.automationLog.count({
        where: { startedAt: { gte: oneDayAgo }, status: 'FAILED' },
      }),
    ])

    const errorRate = totalWorkflows24h > 0 ? (failedWorkflows24h / totalWorkflows24h) * 100 : 0

    return {
      projects: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        recent: recentProjects,
      },
      contracts: {
        total: totalContracts,
        pending: pendingContracts,
        signed: signedContracts,
        signRate: totalContracts > 0 ? (signedContracts / totalContracts) * 100 : 0,
      },
      hours: {
        total: totalHoursAgg._sum.hours ?? 0,
        pending: pendingHours,
        approved: approvedHours,
      },
      invoices: {
        totalAmount: totalAmountAgg._sum.amount ?? 0,
        draft: draftInvoices,
        paid: paidInvoices,
        pending: draftInvoices, // pending = draft invoices
      },
      mileage: {
        totalKilometers: mileageAgg._sum.kilometers ?? 0,
        totalCost: mileageAgg._sum.amount ?? 0,
        totalEntries: totalMileageEntries,
      },
      automation: {
        total: totalAutomations,
        success: successAutomations,
        failed: failedAutomations,
        successRate: totalAutomations > 0 ? (successAutomations / totalAutomations) * 100 : 0,
        recent: recentAutomations,
      },
      margin: {
        overallMargin: Math.round(currentMargin * 10) / 10,
        marginTrend: currentMargin > previousMargin ? ('up' as const) : currentMargin < previousMargin ? ('down' as const) : ('neutral' as const),
        criticalProjects,
        atRiskRevenue: Math.round(atRiskRevenue * 100) / 100,
      },
      timeliness: {
        criticalAlerts,
        pendingHoursUsers,
        unsignedContracts,
        overdueInvoices,
      },
      errors: {
        critical: criticalErrors,
        high: highErrors,
        errorRate: Math.round(errorRate * 10) / 10,
      },
    }
  }),
})
