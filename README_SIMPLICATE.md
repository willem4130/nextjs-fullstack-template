# Simplicate Automation System

Production-ready automation system for Simplicate: contract distribution, hours reminders, and invoice generation.

## 🚀 Quick Start

**New here?** Start with [START_HERE.md](./START_HERE.md) for a 10-minute setup guide.

### Three Steps to Get Started

1. **Get API credentials** from your Simplicate account
   - See [SIMPLICATE_API_GUIDE.md](./SIMPLICATE_API_GUIDE.md)
2. **Add to `.env`** file
   ```env
   SIMPLICATE_API_KEY="your-key"
   SIMPLICATE_API_SECRET="your-secret"
   SIMPLICATE_DOMAIN="yourcompany.simplicate.com"
   ```
3. **Run test:**
   ```bash
   npm run test:simplicate
   ```

That's it! Full guide: [START_HERE.md](./START_HERE.md)

---

## 📖 Overview

This system automates key workflows in Simplicate:

### 1. Contract Distribution 📄
Automatically create and send contracts when team members join projects:
- Webhook triggered when employee added to project
- Contract generated from template
- Sent via email to team member
- Tracked in admin dashboard

### 2. Hours Reminders ⏰
Remind team members to submit their hours on schedule:
- Check for missing hours submissions
- Send email/Slack reminders
- Configurable frequency (weekly/monthly)
- Track reminder history

### 3. Invoice Generation 💰
Generate invoices based on approved hours:
- Aggregate hours per project
- Calculate totals and rates
- Create invoice in Simplicate
- Export to PDF (coming soon)

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: Prisma ORM (SQLite for dev, PostgreSQL for production)
- **API**: tRPC v11 for end-to-end type safety
- **UI**: Tailwind CSS + shadcn/ui components
- **Integrations**: Simplicate API, Resend (email), Slack

---

## 📚 Documentation

### Getting Started
- 📖 [**START_HERE.md**](./START_HERE.md) - Begin here! 10-minute quick start
- 🔑 [**SIMPLICATE_API_GUIDE.md**](./SIMPLICATE_API_GUIDE.md) - Get your API credentials
- 🚀 [**GETTING_STARTED.md**](./GETTING_STARTED.md) - Complete setup walkthrough

### Configuration
- ⚙️ [**SIMPLICATE_SETUP.md**](./SIMPLICATE_SETUP.md) - Full technical setup guide
- 🗄️ [**SUPABASE_SETUP.md**](./SUPABASE_SETUP.md) - PostgreSQL database setup
- 🐛 [**SENTRY_SETUP.md**](./SENTRY_SETUP.md) - Error tracking setup

### Reference
- 📡 [**API_DOCUMENTATION.md**](./API_DOCUMENTATION.md) - Complete API reference
- 📊 [**ANALYTICS.md**](./ANALYTICS.md) - Analytics and monitoring setup

### Development
- 📝 [**PROJECT_SUMMARY.md**](./PROJECT_SUMMARY.md) - Project overview and architecture
- ✅ [**WHAT_WORKS.md**](./WHAT_WORKS.md) - Current feature status
- 🧪 [**TEST_RESULTS.md**](./TEST_RESULTS.md) - Test coverage and results

---

## 📁 Project Structure

```
simplicate-automations/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── admin/                    # Admin dashboard
│   │   │   ├── dashboard/            # Main dashboard page
│   │   │   ├── projects/             # Projects list
│   │   │   ├── contracts/            # Contracts management
│   │   │   └── layout.tsx            # Admin layout with sidebar
│   │   └── api/                      # API routes
│   │       ├── trpc/[trpc]/          # tRPC endpoint
│   │       ├── webhooks/             # Webhook handlers
│   │       │   └── simplicate/       # Simplicate webhook
│   │       └── cron/                 # Scheduled jobs
│   │           ├── hours-reminder/   # Hours reminder cron
│   │           └── invoice-generation/ # Invoice cron
│   ├── components/                   # React components
│   │   └── ui/                       # shadcn/ui components
│   ├── lib/                          # Core libraries
│   │   ├── simplicate/               # Simplicate API client
│   │   │   ├── client.ts             # API client
│   │   │   ├── types.ts              # TypeScript types
│   │   │   └── index.ts              # Exports
│   │   ├── workflows/                # Automation workflows
│   │   │   ├── contract-distribution.ts
│   │   │   ├── hours-reminder.ts
│   │   │   └── invoice-generation.ts
│   │   └── notifications/            # Notification services
│   │       ├── email.ts              # Email via Resend
│   │       ├── slack.ts              # Slack messages
│   │       └── index.ts              # Unified interface
│   ├── server/                       # Server-side code
│   │   ├── api/                      # tRPC routers
│   │   │   ├── routers/              # API routers
│   │   │   │   ├── projects.ts       # Projects API
│   │   │   │   ├── contracts.ts      # Contracts API
│   │   │   │   ├── dashboard.ts      # Dashboard API
│   │   │   │   └── automation.ts     # Automation API
│   │   │   ├── root.ts               # Root router
│   │   │   └── trpc.ts               # tRPC setup
│   │   └── db/                       # Database
│   │       └── index.ts              # Prisma client
│   └── env.js                        # Environment validation
├── prisma/
│   └── schema.prisma                 # Database schema
├── scripts/
│   └── test-simplicate.ts            # Connection test script
├── .env                              # Environment variables (SECRET!)
├── .env.example                      # Environment template
└── package.json                      # Dependencies and scripts
```

---

## ⚡ Available Commands

### Development
```bash
# Start dev server
npm run dev

# Test Simplicate connection
npm run test:simplicate

# Type check
npm run typecheck

# Lint code
npm run lint

# Format code
npm run format
```

### Database
```bash
# Push schema changes
npm run db:push

# Create migration
npm run db:migrate

# Open Prisma Studio (GUI)
npm run db:studio

# Generate Prisma Client
npm run db:generate
```

### Testing
```bash
# Run unit tests
npm run test

# Run unit tests with UI
npm run test:ui

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### Production
```bash
# Build for production
npm run build

# Start production server
npm run start
```

---

## 🎯 Features

### ✅ Working Now

- **Simplicate API Integration**
  - Full CRUD operations for projects, employees, hours
  - Document upload/download
  - Webhook support
  - Type-safe client

- **Admin Dashboard**
  - Overview stats (projects, contracts, hours)
  - Projects list with sync status
  - Recent activity logs
  - Responsive design with sidebar navigation

- **Contract Distribution**
  - Automatic contract creation on project assignment
  - Email notifications (with Resend)
  - Slack notifications (optional)
  - Track contract status

- **Hours Reminders**
  - Manual trigger via API
  - Check for missing hours
  - Multi-channel notifications
  - Reminder history

- **Database**
  - Projects synced from Simplicate
  - Employees and their details
  - Contracts and their status
  - Hours and time entries
  - Automation logs

### 🚧 Coming Soon

- **Invoice Generation**
  - Automatic monthly invoicing
  - PDF generation
  - Send to accounting system

- **Advanced Dashboard**
  - Project detail pages
  - Contract management interface
  - Hours approval workflow
  - Analytics and charts

- **User Workspace**
  - Team member portal
  - Contract signing interface
  - Hours submission form
  - Personal dashboard

- **Authentication**
  - NextAuth setup
  - Role-based access control
  - User management

---

## 🔧 Configuration

### Required

These must be configured for the system to work:

```env
# Database
DATABASE_URL="file:./dev.db"  # SQLite for dev
DIRECT_URL="file:./dev.db"

# Simplicate API
SIMPLICATE_API_KEY="your-key"
SIMPLICATE_API_SECRET="your-secret"
SIMPLICATE_DOMAIN="yourcompany.simplicate.com"

# NextAuth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

### Optional

These enhance functionality but aren't required:

```env
# Email (Resend)
RESEND_API_KEY="re_your_api_key"
EMAIL_FROM="noreply@yourdomain.com"

# Slack
SLACK_BOT_TOKEN="xoxb-your-slack-bot-token"

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# Error Tracking (Sentry)
NEXT_PUBLIC_SENTRY_DSN="https://your-key@sentry.io/your-project"
```

---

## 🚀 Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/simplicate-automations.git
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository

3. **Add Environment Variables**
   - Copy all variables from `.env`
   - Add them in Vercel dashboard
   - Update `DATABASE_URL` to PostgreSQL connection string

4. **Deploy**
   - Vercel will build and deploy automatically
   - Get your production URL

5. **Update Webhook in Simplicate**
   - Change webhook URL to: `https://your-app.vercel.app/api/webhooks/simplicate`

### Set Up PostgreSQL

For production, use a managed PostgreSQL service:

- [Supabase](https://supabase.com) - Free tier, easy setup
- [Neon](https://neon.tech) - Serverless Postgres
- [Railway](https://railway.app) - Simple deployment
- [Render](https://render.com) - All-in-one platform

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions.

---

## 🔐 Security

### Best Practices

- ✅ All API credentials in `.env` (never commit)
- ✅ `.env` is in `.gitignore`
- ✅ API routes protected with rate limiting
- ✅ Input validation with Zod schemas
- ✅ HTTPS in production
- ✅ Environment variables validated on startup

### Permissions

The Simplicate API key needs these permissions:
- Read projects
- Read employees
- Read/write hours
- Read/write documents
- Read/write invoices
- Webhook management

---

## 📊 Monitoring

### Development

- **Terminal logs**: Watch `npm run dev` output
- **Prisma Studio**: Visual database browser
- **Browser DevTools**: Network and console logs

### Production

- **Vercel Logs**: Real-time logs in dashboard
- **Sentry**: Error tracking with session replay
- **Vercel Analytics**: Privacy-friendly analytics
- **Speed Insights**: Performance monitoring

---

## 🤝 Contributing

This is a private project, but you can:

1. **Report issues**: Open an issue with details
2. **Suggest features**: Describe your use case
3. **Submit PRs**: Fork, branch, PR with description

---

## 📞 Support

### Resources

- 📖 [Documentation](#-documentation) - Start here
- 💬 [GitHub Issues](https://github.com/yourusername/simplicate-automations/issues) - Report bugs
- 📧 Email: willem@scex.nl

### Common Issues

See [GETTING_STARTED.md](./GETTING_STARTED.md#-troubleshooting) for solutions to:
- Connection problems
- Webhook issues
- Database errors
- Email failures

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org)
- [Prisma](https://prisma.io)
- [tRPC](https://trpc.io)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)

---

**Ready to automate?** Start with [START_HERE.md](./START_HERE.md) 🚀
