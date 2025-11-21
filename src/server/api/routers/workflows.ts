import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'

const workflowConfigInput = z.object({
  contractDistribution: z.boolean().default(false),
  hoursReminder: z.boolean().default(false),
  invoiceGeneration: z.boolean().default(false),
  contractConfig: z.any().optional(),
  hoursReminderConfig: z.any().optional(),
  invoiceConfig: z.any().optional(),
})

export const workflowsRouter = createTRPCRouter({
  // Get workflow configuration for a specific project
  getConfig: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const config = await ctx.db.workflowConfig.findUnique({
        where: { projectId: input.projectId },
      })

      return config
    }),

  // Get all projects with active workflows
  getActiveWorkflows: publicProcedure.query(async ({ ctx }) => {
    const configs = await ctx.db.workflowConfig.findMany({
      where: { isActive: true },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            clientName: true,
            status: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return configs
  }),

  // Save or update workflow configuration for a project
  saveConfig: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        config: workflowConfigInput,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { projectId, config } = input

      // Check if project exists
      const project = await ctx.db.project.findUnique({
        where: { id: projectId },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      // Upsert workflow configuration
      const workflowConfig = await ctx.db.workflowConfig.upsert({
        where: { projectId },
        create: {
          projectId,
          ...config,
          isActive: true,
        },
        update: {
          ...config,
          isActive: true,
          updatedAt: new Date(),
        },
      })

      return {
        success: true,
        config: workflowConfig,
      }
    }),

  // Toggle a specific workflow on/off
  toggleWorkflow: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        workflowType: z.enum(['contractDistribution', 'hoursReminder', 'invoiceGeneration']),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { projectId, workflowType, enabled } = input

      // Get existing config or create new one
      const existingConfig = await ctx.db.workflowConfig.findUnique({
        where: { projectId },
      })

      if (!existingConfig) {
        // Create new config with this workflow enabled
        const newConfig = await ctx.db.workflowConfig.create({
          data: {
            projectId,
            [workflowType]: enabled,
            isActive: true,
          },
        })
        return { success: true, config: newConfig }
      }

      // Update existing config
      const updatedConfig = await ctx.db.workflowConfig.update({
        where: { projectId },
        data: {
          [workflowType]: enabled,
        },
      })

      return { success: true, config: updatedConfig }
    }),

  // Delete workflow configuration
  deleteConfig: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.workflowConfig.delete({
        where: { projectId: input.projectId },
      })

      return { success: true }
    }),

  // Deactivate workflow configuration (soft delete)
  deactivateConfig: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.db.workflowConfig.update({
        where: { projectId: input.projectId },
        data: { isActive: false },
      })

      return { success: true, config }
    }),
})
