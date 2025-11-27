import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { EmailTemplateType } from '@prisma/client'
import {
  getAvailableVariables,
  validateTemplateVariables,
  renderPreview,
} from '@/lib/email/variables'
import {
  getDefaultContractReminderHtml,
  getDefaultContractReminderSubject,
} from '@/lib/email/service'

const EmailTemplateTypeEnum = z.enum([
  'CONTRACT_REMINDER',
  'HOURS_REMINDER',
  'CUSTOM',
])

export const emailTemplatesRouter = createTRPCRouter({
  // Get all templates
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.emailTemplate.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { sentEmails: true },
        },
      },
    })
  }),

  // Get active templates only
  getActive: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.emailTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })
  }),

  // Get single template by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.emailTemplate.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { sentEmails: true },
          },
        },
      })
    }),

  // Get templates by type
  getByType: publicProcedure
    .input(z.object({ type: EmailTemplateTypeEnum }))
    .query(async ({ ctx, input }) => {
      return ctx.db.emailTemplate.findMany({
        where: { type: input.type as EmailTemplateType, isActive: true },
        orderBy: { name: 'asc' },
      })
    }),

  // Create new template
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        type: EmailTemplateTypeEnum,
        description: z.string().optional(),
        subject: z.string().min(1).max(200),
        bodyHtml: z.string().min(1),
        variables: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate that template doesn't use unknown variables
      const subjectValidation = validateTemplateVariables(input.subject)
      const bodyValidation = validateTemplateVariables(input.bodyHtml)

      if (!subjectValidation.valid) {
        throw new Error(
          `Unknown variables in subject: ${subjectValidation.unknownVariables.join(', ')}`
        )
      }

      if (!bodyValidation.valid) {
        throw new Error(
          `Unknown variables in body: ${bodyValidation.unknownVariables.join(', ')}`
        )
      }

      // Collect all used variables
      const usedVariables = [
        ...new Set([
          ...subjectValidation.usedVariables,
          ...bodyValidation.usedVariables,
        ]),
      ]

      return ctx.db.emailTemplate.create({
        data: {
          name: input.name,
          type: input.type as EmailTemplateType,
          description: input.description,
          subject: input.subject,
          bodyHtml: input.bodyHtml,
          variables: JSON.stringify(usedVariables),
          isActive: input.isActive ?? true,
        },
      })
    }),

  // Update template
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        subject: z.string().min(1).max(200).optional(),
        bodyHtml: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // If updating subject or body, validate variables
      if (data.subject) {
        const validation = validateTemplateVariables(data.subject)
        if (!validation.valid) {
          throw new Error(
            `Unknown variables in subject: ${validation.unknownVariables.join(', ')}`
          )
        }
      }

      if (data.bodyHtml) {
        const validation = validateTemplateVariables(data.bodyHtml)
        if (!validation.valid) {
          throw new Error(
            `Unknown variables in body: ${validation.unknownVariables.join(', ')}`
          )
        }
      }

      // Recalculate used variables if subject or body changed
      let variables: string | undefined
      if (data.subject || data.bodyHtml) {
        const template = await ctx.db.emailTemplate.findUnique({
          where: { id },
        })
        if (template) {
          const finalSubject = data.subject || template.subject
          const finalBody = data.bodyHtml || template.bodyHtml
          const subjectVars = validateTemplateVariables(finalSubject).usedVariables
          const bodyVars = validateTemplateVariables(finalBody).usedVariables
          variables = JSON.stringify([...new Set([...subjectVars, ...bodyVars])])
        }
      }

      return ctx.db.emailTemplate.update({
        where: { id },
        data: {
          ...data,
          ...(variables && { variables }),
        },
      })
    }),

  // Delete template
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if template has been used
      const sentCount = await ctx.db.sentEmail.count({
        where: { templateId: input.id },
      })

      if (sentCount > 0) {
        // Don't delete, just deactivate
        return ctx.db.emailTemplate.update({
          where: { id: input.id },
          data: { isActive: false },
        })
      }

      return ctx.db.emailTemplate.delete({
        where: { id: input.id },
      })
    }),

  // Preview template with sample data
  preview: publicProcedure
    .input(
      z.object({
        subject: z.string(),
        bodyHtml: z.string(),
      })
    )
    .query(({ input }) => {
      return {
        subject: renderPreview(input.subject),
        bodyHtml: renderPreview(input.bodyHtml),
      }
    }),

  // Get available variables for template editor
  getVariables: publicProcedure.query(() => {
    return {
      available: getAvailableVariables(),
      descriptions: {
        memberName: 'Volledige naam van het teamlid',
        memberFirstName: 'Voornaam van het teamlid',
        memberEmail: 'E-mailadres van het teamlid',
        projectName: 'Naam van het project',
        projectNumber: 'Projectnummer (bijv. P2024-001)',
        clientName: 'Naam van de klant',
        simplicateUrl: 'Link naar project in Simplicate',
        uploadUrl: 'Beveiligde upload link',
        appUrl: 'Applicatie URL',
        currentDate: 'Huidige datum',
        currentYear: 'Huidig jaar',
      },
    }
  }),

  // Seed default templates
  seedDefaults: publicProcedure.mutation(async ({ ctx }) => {
    const existingContract = await ctx.db.emailTemplate.findFirst({
      where: { type: 'CONTRACT_REMINDER' },
    })

    const created: string[] = []

    if (!existingContract) {
      await ctx.db.emailTemplate.create({
        data: {
          name: 'Contract Herinnering (Standaard)',
          type: 'CONTRACT_REMINDER',
          description:
            'Standaard template voor het herinneren van teamleden om hun contract te uploaden.',
          subject: getDefaultContractReminderSubject(),
          bodyHtml: getDefaultContractReminderHtml(),
          variables: JSON.stringify([
            'memberFirstName',
            'projectName',
            'clientName',
            'uploadUrl',
            'simplicateUrl',
          ]),
          isActive: true,
        },
      })
      created.push('CONTRACT_REMINDER')
    }

    return {
      created,
      message:
        created.length > 0
          ? `Created ${created.length} default template(s)`
          : 'All default templates already exist',
    }
  }),
})
