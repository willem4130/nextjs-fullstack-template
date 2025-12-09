import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { z } from 'zod'

export const marginRouter = createTRPCRouter({
  // Get project-level margin breakdown
  getProjectMargins: publicProcedure
    .input(z.object({
      sort: z.enum(['margin-asc', 'margin-desc', 'revenue-desc', 'name-asc']).optional().default('margin-asc'),
      status: z.enum(['ACTIVE', 'COMPLETED', 'ALL']).optional().default('ACTIVE'),
      page: z.number().optional().default(1),
      limit: z.number().optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      // Build where clause
      const where = input.status === 'ALL' ? {} : { status: input.status }

      // Get projects with their hours
      const projects = await ctx.db.project.findMany({
        where,
        include: {
          hoursEntries: {
            select: {
              hours: true,
              salesRate: true,
              costRate: true,
              revenue: true,
              cost: true,
            },
          },
        },
        take: input.limit,
        skip: (input.page - 1) * input.limit,
      })

      // Calculate margins for each project
      const projectMargins = projects.map((project) => {
        const totalHours = project.hoursEntries.reduce((sum, h) => sum + h.hours, 0)
        const totalRevenue = project.hoursEntries.reduce((sum, h) => sum + (h.revenue ?? 0), 0)
        const totalCost = project.hoursEntries.reduce((sum, h) => sum + (h.cost ?? 0), 0)
        const margin = totalRevenue - totalCost
        const marginPercentage = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0

        return {
          id: project.id,
          name: project.name,
          clientName: project.clientName,
          status: project.status,
          totalHours,
          revenue: totalRevenue,
          cost: totalCost,
          margin,
          marginPercentage,
          severity: marginPercentage < 15 ? ('critical' as const) :
                   marginPercentage < 25 ? ('warning' as const) :
                   ('healthy' as const),
        }
      })

      // Sort projects
      const sortedProjects = projectMargins.sort((a, b) => {
        switch (input.sort) {
          case 'margin-asc':
            return a.marginPercentage - b.marginPercentage
          case 'margin-desc':
            return b.marginPercentage - a.marginPercentage
          case 'revenue-desc':
            return b.revenue - a.revenue
          case 'name-asc':
            return a.name.localeCompare(b.name)
          default:
            return 0
        }
      })

      // Get total count for pagination
      const totalCount = await ctx.db.project.count({ where })

      return {
        projects: sortedProjects,
        pagination: {
          page: input.page,
          limit: input.limit,
          total: totalCount,
          pages: Math.ceil(totalCount / input.limit),
        },
      }
    }),

  // Get margin overview
  getOverview: publicProcedure.query(async ({ ctx }) => {
    const projects = await ctx.db.project.findMany({
      where: { status: 'ACTIVE' },
      include: {
        hoursEntries: {
          select: {
            revenue: true,
            cost: true,
          },
        },
      },
    })

    let totalRevenue = 0
    let totalCost = 0
    let criticalCount = 0
    let warningCount = 0
    let healthyCount = 0
    let criticalRevenue = 0
    let warningRevenue = 0

    projects.forEach((project) => {
      const projectRevenue = project.hoursEntries.reduce((sum, h) => sum + (h.revenue ?? 0), 0)
      const projectCost = project.hoursEntries.reduce((sum, h) => sum + (h.cost ?? 0), 0)
      const projectMargin = projectRevenue - projectCost
      const marginPercentage = projectRevenue > 0 ? (projectMargin / projectRevenue) * 100 : 0

      totalRevenue += projectRevenue
      totalCost += projectCost

      if (marginPercentage < 15) {
        criticalCount++
        criticalRevenue += projectRevenue
      } else if (marginPercentage < 25) {
        warningCount++
        warningRevenue += projectRevenue
      } else {
        healthyCount++
      }
    })

    const overallMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0

    return {
      overallMargin,
      totalRevenue,
      totalCost,
      totalMargin: totalRevenue - totalCost,
      projects: {
        total: projects.length,
        critical: criticalCount,
        warning: warningCount,
        healthy: healthyCount,
      },
      atRisk: {
        criticalRevenue,
        warningRevenue,
        totalAtRisk: criticalRevenue + warningRevenue,
      },
    }
  }),
})
