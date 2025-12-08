import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'

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
    }
  }),
})
