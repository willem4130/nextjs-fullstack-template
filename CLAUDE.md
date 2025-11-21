# Simplicate Automations

Production-ready automation system for Simplicate that handles contract distribution, hours reminders, and invoice generation with a full-stack Next.js admin dashboard.

## Current Status

✅ **Complete:**
- Simplicate sync functionality (imports projects from API)
- Settings page with "Sync Now" button
- Workflows page UI (project selection, workflow cards)
- Admin navigation with Workflows link

🚧 **Next Steps - Workflow Configuration:**
1. Add database schema for workflow configurations
2. Create tRPC mutations to save/load workflow configs
3. Wire up "Save & Activate" button functionality
4. Add workflow status indicators per project
5. Implement workflow execution logic

## Project Structure

```
src/
├── app/admin/
│   ├── dashboard/          # Main dashboard with stats
│   ├── workflows/          # 🆕 Workflow configuration UI (needs save functionality)
│   ├── settings/           # Settings with Simplicate sync button
│   └── users/              # User management
├── server/api/routers/
│   ├── sync.ts            # 🆕 Simplicate project sync (complete)
│   ├── projects.ts        # Project CRUD and stats
│   ├── automation.ts      # Automation logs and stats
│   └── workflows.ts       # ⚠️ TODO: Create this for workflow config persistence
├── lib/
│   ├── simplicate/        # Simplicate API client
│   └── workflows/         # Workflow execution logic (contract, hours, invoice)
└── prisma/schema.prisma   # ⚠️ TODO: Add WorkflowConfig model
```

## Next Implementation: Workflow Configuration Persistence

### 1. Update Database Schema
Add to `prisma/schema.prisma`:
```prisma
model WorkflowConfig {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Workflow types enabled for this project
  contractDistribution Boolean @default(false)
  hoursReminder        Boolean @default(false)
  invoiceGeneration    Boolean @default(false)

  // Configuration for each workflow
  contractConfig       Json?   // e.g., { "recipients": [...], "template": "..." }
  hoursReminderConfig  Json?   // e.g., { "reminderDays": [1, 3, 7], "recipients": [...] }
  invoiceConfig        Json?   // e.g., { "autoApprove": true, "template": "..." }

  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([projectId])
}
```

### 2. Create Workflow Router
File: `src/server/api/routers/workflows.ts`
- `saveConfig` mutation: Save workflow configuration for a project
- `getConfig` query: Get workflow configuration for a project
- `toggleWorkflow` mutation: Enable/disable specific workflows
- `getActiveWorkflows` query: Get all projects with active workflows

### 3. Update Workflows Page
File: `src/app/admin/workflows/page.tsx`
- Wire up "Save & Activate" button to `saveConfig` mutation
- Load existing config on project selection
- Show enabled workflows with checkmarks
- Add success/error toast notifications

## Organization Rules

**Workflow Implementation Pattern:**
- Database schema → `prisma/schema.prisma`
- Backend mutations/queries → `src/server/api/routers/workflows.ts`
- Frontend UI → `src/app/admin/workflows/page.tsx`
- Workflow execution → `src/lib/workflows/[workflow-name].ts`

**Single responsibility:**
- One router file per domain (projects, workflows, automation, sync)
- One workflow execution file per automation type
- UI components for reusable workflow cards

## Code Quality - Zero Tolerance

After editing ANY file, run:
```bash
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint validation (skip if config issue)
```

**Database changes:**
```bash
npm run db:push      # Push schema changes
npm run db:generate  # Regenerate Prisma client
npm run dev          # Restart server to load new schema
```

## Quick Start for Next Task

To implement workflow configuration persistence:
1. Update `prisma/schema.prisma` with WorkflowConfig model
2. Run `npm run db:push && npm run db:generate`
3. Create `src/server/api/routers/workflows.ts`
4. Add router to `src/server/api/root.ts`
5. Update `src/app/admin/workflows/page.tsx` to use new mutations
6. Test: Select project → Enable workflows → Save → Reload page to verify persistence
