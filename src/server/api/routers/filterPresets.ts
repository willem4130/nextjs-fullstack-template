import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'

const FilterSchema = z.object({
  months: z.array(z.string()).optional(),
  projects: z.array(z.string()).optional(),
  employees: z.array(z.string()).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export const filterPresetsRouter = createTRPCRouter({
  // Get all presets for a page (user's + shared)
  getAll: publicProcedure
    .input(z.object({ page: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.filterPreset.findMany({
        where: { page: input.page },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      })
    }),

  // Get default preset for a page
  getDefault: publicProcedure
    .input(z.object({ page: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.filterPreset.findFirst({
        where: { page: input.page, isDefault: true },
      })
    }),

  // Create a new preset
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        page: z.string(),
        filters: FilterSchema,
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // If setting as default, unset other defaults for this page
      if (input.isDefault) {
        await ctx.db.filterPreset.updateMany({
          where: { page: input.page, isDefault: true },
          data: { isDefault: false },
        })
      }

      return ctx.db.filterPreset.create({
        data: {
          name: input.name,
          page: input.page,
          filters: input.filters,
          isDefault: input.isDefault ?? false,
        },
      })
    }),

  // Update a preset
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(50).optional(),
        filters: FilterSchema.optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const preset = await ctx.db.filterPreset.findUnique({
        where: { id: input.id },
      })

      if (!preset) {
        throw new Error('Preset not found')
      }

      // If setting as default, unset other defaults for this page
      if (input.isDefault) {
        await ctx.db.filterPreset.updateMany({
          where: { page: preset.page, isDefault: true, id: { not: input.id } },
          data: { isDefault: false },
        })
      }

      return ctx.db.filterPreset.update({
        where: { id: input.id },
        data: {
          name: input.name,
          filters: input.filters,
          isDefault: input.isDefault,
        },
      })
    }),

  // Delete a preset
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.filterPreset.delete({
        where: { id: input.id },
      })
    }),

  // Set default preset
  setDefault: publicProcedure
    .input(z.object({ id: z.string(), page: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Unset all defaults for this page
      await ctx.db.filterPreset.updateMany({
        where: { page: input.page, isDefault: true },
        data: { isDefault: false },
      })

      // Set new default
      return ctx.db.filterPreset.update({
        where: { id: input.id },
        data: { isDefault: true },
      })
    }),
})
