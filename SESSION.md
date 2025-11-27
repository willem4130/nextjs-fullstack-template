# Session State - Simplicate Automation System

**Last Updated**: November 27, 2025, 2:30 PM
**Session Type**: Complex
**Project**: Simplicate Automation System - Email Automation MVP

---

## 🎯 Current Objective

Build an email automation system to send templated emails to project members with document upload capability. First use case: Contract reminder in Dutch - remind project members to upload signed contracts.

---

## Progress Summary

### ✅ Completed Tasks

- **Email Automation Schema** - Added EmailTemplate, SentEmail, DocumentRequest models to Prisma
- **Email Service** - Created variable substitution engine ({{memberName}}, {{projectName}}, etc.)
- **Email Templates Router** - CRUD operations, preview, seed defaults
- **Project Emails Router** - Send to members, track document requests, handle uploads
- **Email Templates Page** - `/admin/email-templates` with full CRUD UI
- **Upload Portal** - `/upload/[token]` public page for document uploads
- **Vercel Blob Integration** - Document storage for uploaded files
- **Dutch Default Template** - Contract reminder template pre-built
- **Deployed to production** - All features live

### 🚧 In Progress

- **Phase 4: Send Email from Project Page** - Need to add dialog/button to project detail page

### 📋 Pending Tasks

- Add "Send Email" dialog to project detail page (`/admin/projects/[id]`)
- Add BLOB_READ_WRITE_TOKEN to Vercel environment variables
- Test end-to-end email → upload flow
- Add email tracking (opens/clicks) via Resend webhooks (future)
- Add scheduled/cron emails for hours reminders (future)

---

## 🔑 Key Decisions Made

**Scope: MVP First**
- **Choice**: Start with basic templates + manual send + upload portal
- **Deferred**: Scheduled emails, open/click tracking, Simplicate sync
- **Rationale**: Get core flow working first, add automation later

**Document Storage: Vercel Blob**
- **Choice**: Use Vercel Blob for document storage
- **Alternatives**: Simplicate documents, S3, local storage
- **Rationale**: Simple, built into Vercel, good free tier

**Upload UX: Both Options**
- **Choice**: Email contains both custom portal link AND Simplicate link
- **Rationale**: User requested flexibility - members can choose

**Templates: Database + UI**
- **Choice**: Store templates in DB with admin UI for editing
- **Alternative**: Hardcoded templates in code
- **Rationale**: User wants to edit templates without code changes

**Page Location: Dedicated Page**
- **Choice**: Created `/admin/email-templates` instead of adding to Settings
- **Rationale**: Settings page was already very long, cleaner separation

---

## 📁 Files Modified

### Created
- `src/lib/email/variables.ts` - Variable substitution engine
- `src/lib/email/service.ts` - Email sending with template support
- `src/server/api/routers/emailTemplates.ts` - CRUD for templates
- `src/server/api/routers/projectEmails.ts` - Send emails, manage uploads
- `src/app/admin/email-templates/page.tsx` - Template management UI
- `src/app/upload/[token]/page.tsx` - Public document upload portal
- `src/components/ui/textarea.tsx` - Textarea component for template editor

### Modified
- `prisma/schema.prisma` - Added EmailTemplate, SentEmail, DocumentRequest models + enums
- `src/server/api/root.ts` - Registered emailTemplates and projectEmails routers
- `package.json` - Added @vercel/blob dependency

---

## 🏗️ Patterns & Architecture

**Variable Substitution**:
- Pattern: `{{variableName}}` in templates
- Supported: memberName, memberFirstName, memberEmail, projectName, projectNumber, clientName, uploadUrl, simplicateUrl, appUrl, currentDate, currentYear

**Upload Flow**:
1. Admin sends email with template → creates DocumentRequest with uploadToken
2. Email contains `/upload/[token]` link
3. Team member uploads file → stored in Vercel Blob
4. DocumentRequest updated with status=UPLOADED

**Email Template HTML**:
- Base wrapper with consistent styling
- Supports custom HTML in bodyHtml field
- Auto-wraps in professional email layout

**Dependencies Added**:
- `@vercel/blob` - Document storage

---

## 💡 Context & Notes

**Production URL**: https://simplicate-automations.vercel.app/

**New Pages**:
- `/admin/email-templates` - Template management
- `/upload/[token]` - Public upload portal (no auth required)

**Environment Variables Needed**:
```
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxx  # For document uploads
RESEND_API_KEY=re_xxxxx                   # Already configured
```

**Default Template (Dutch)**:
- Name: "Contract Herinnering (Standaard)"
- Type: CONTRACT_REMINDER
- Subject: "Contract vereist voor {{projectName}}"

**To Test**:
1. Go to `/admin/email-templates`
2. Click "Standaard Templates" to seed default
3. Create document request manually or implement project page Send Email dialog
4. Visit upload URL with token

---

## 🔄 Continuation Prompt

**Use this to resume work in a new session:**

---

I'm continuing work on the Email Automation System for Simplicate Automations.

**Read these files first**:
- `SESSION.md` (detailed session context)
- `CLAUDE.md` (project overview)

**Current Status**: Email automation MVP deployed, need to add Send Email button to project page

**Just Completed (This Session)**:
- ✅ Database schema: EmailTemplate, SentEmail, DocumentRequest models
- ✅ Email service with variable substitution ({{memberName}}, etc.)
- ✅ `/admin/email-templates` page with full CRUD + preview
- ✅ `/upload/[token]` public upload portal with drag & drop
- ✅ Vercel Blob integration for document storage
- ✅ Dutch contract reminder default template
- ✅ All deployed to production

**Next Steps**:
1. Add "Send Email" dialog to `/admin/projects/[id]` page (select template, select members, send)
2. Add BLOB_READ_WRITE_TOKEN to Vercel environment variables
3. Test end-to-end: send email → member receives → uploads document

**Key Files**:
- `src/server/api/routers/projectEmails.ts` - sendToMembers mutation (already built)
- `src/app/admin/projects/[id]/page.tsx` - Need to add Send Email button/dialog
- `src/app/admin/email-templates/page.tsx` - Template management (done)
- `src/app/upload/[token]/page.tsx` - Upload portal (done)

**URLs**:
- Email Templates: https://simplicate-automations.vercel.app/admin/email-templates
- Upload Portal: https://simplicate-automations.vercel.app/upload/[token]

---

---

## 📚 Previous Session Notes

**Session: November 27, 2025, 2:30 PM - Email Automation MVP**
- Built complete email automation system
- Templates in DB with admin UI
- Upload portal with Vercel Blob
- Dutch contract reminder template
- Still need: Send Email button on project page

**Session: November 27, 2025, 11:30 AM - Hours Page UX**
- Fixed "All months" showing current month only
- Added Select All to MultiSelect
- Changed "Hours Selected" to "Total Hours"
- Verified all syncs working

**Session: November 27, 2025, 10:45 AM - Phase 3 Complete**
- Discovered cost rates in /hrm/timetable endpoint
- Added getTimetables() to Simplicate client
- Updated syncEmployees() to fetch from timetables
- Updated syncHours() with financial calculations
- Added all sync buttons to Settings page
- Tested: 425/426 entries with financials

**Session: November 26, 2025 - Financial Tracking**
- Created Financial Tracking plan (8 phases)
- Phase 1 & 2: Schema + rate resolution system

---

**Session Complexity**: Complex (11 files created/modified, new feature)
**Build Status**: ✅ Typecheck passes
**Deployment Status**: ✅ Latest deployed to Vercel

---
