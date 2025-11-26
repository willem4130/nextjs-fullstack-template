import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'

export const ratesRouter = createTRPCRouter({
  // Get rate overview showing hierarchy: User > Project > Service-Employee
  getRateOverview: publicProcedure.query(async ({ ctx }) => {
    // Get all users with their rates
    const users = await ctx.db.user.findMany({
      where: {
        OR: [
          { defaultSalesRate: { not: null } },
          { defaultCostRate: { not: null } },
          { salesRateOverride: { not: null } },
          { costRateOverride: { not: null } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        simplicateEmployeeType: true,
        defaultSalesRate: true,
        defaultCostRate: true,
        salesRateOverride: true,
        costRateOverride: true,
        ratesSyncedAt: true,
      },
      orderBy: { name: 'asc' },
    })

    // Get project-level rate overrides
    const projectRates = await ctx.db.projectMember.findMany({
      where: {
        OR: [
          { salesRate: { not: null } },
          { costRate: { not: null } },
        ],
      },
      select: {
        id: true,
        salesRate: true,
        costRate: true,
        salesRateSource: true,
        costRateSource: true,
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
            projectNumber: true,
          },
        },
      },
      orderBy: {
        project: { name: 'asc' },
      },
    })

    // Get service-employee level rate overrides
    const serviceRates = await ctx.db.serviceEmployeeRate.findMany({
      select: {
        id: true,
        salesRate: true,
        costRate: true,
        salesRateSource: true,
        costRateSource: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        projectService: {
          select: {
            id: true,
            name: true,
            project: {
              select: {
                id: true,
                name: true,
                projectNumber: true,
              },
            },
          },
        },
      },
    })

    return {
      userRates: users,
      projectRates,
      serviceRates,
      stats: {
        usersWithRates: users.length,
        projectOverrides: projectRates.length,
        serviceOverrides: serviceRates.length,
      },
    }
  }),

  // Get all rates for a specific project (with drill-down)
  getProjectRates: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        select: {
          id: true,
          name: true,
          projectNumber: true,
          members: {
            select: {
              id: true,
              salesRate: true,
              costRate: true,
              salesRateSource: true,
              costRateSource: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  defaultSalesRate: true,
                  defaultCostRate: true,
                },
              },
            },
          },
          services: {
            select: {
              id: true,
              name: true,
              defaultHourlyRate: true,
              employeeRates: {
                select: {
                  id: true,
                  salesRate: true,
                  costRate: true,
                  salesRateSource: true,
                  costRateSource: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      return project
    }),
})
