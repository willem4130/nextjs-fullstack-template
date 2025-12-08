# Deployment Guide - Vercel + GitHub + Postgres

## Quick Start

**GitHub Repository**: https://github.com/willem4130/nextjs-fullstack-template
**Branch**: `phase1-foundation` (pushed and ready)

---

## Step 1: Import Project to Vercel

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select: `willem4130/nextjs-fullstack-template`
4. **Configure Project**:
   - **Project Name**: `supply-chain-simulator` (or your preferred name)
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `prisma generate && next build` (from vercel.json)
   - **Branch**: `phase1-foundation` (important!)

5. **Add Environment Variables** (click "Environment Variables"):

   ```bash
   # Required - Generate a random secret
   NEXTAUTH_SECRET=your-generated-secret-here

   # Required - Will be your production URL (add after first deployment)
   NEXTAUTH_URL=https://your-app-name.vercel.app

   # Optional - For email (can add later)
   RESEND_API_KEY=your-resend-api-key
   ```

   **Generate NEXTAUTH_SECRET** on your local machine:
   ```bash
   openssl rand -base64 32
   ```

6. Click **"Deploy"** (first deployment will complete in ~2 minutes)

---

## Step 2: Add Vercel Postgres Database

After the first deployment:

1. Go to your project dashboard in Vercel
2. Click **"Storage"** tab
3. Click **"Create Database"**
4. Select **"Postgres"**
5. Database Name: `supply-chain-db` (or your preferred name)
6. Region: Choose closest to your users (e.g., `us-east-1` for US)
7. Click **"Create"**

Vercel will automatically:
- Add `DATABASE_URL` environment variable to your project
- Link the database to your deployment

---

## Step 3: Run Database Migrations

After database creation, you need to push the Prisma schema:

### Option A: Via Vercel CLI (Recommended)

From your local project directory:

```bash
# Pull environment variables (includes DATABASE_URL)
vercel env pull .env.local

# Run Prisma migration
npx prisma db push

# Verify connection
npx prisma studio
```

### Option B: Via Production Build

Vercel automatically runs `prisma generate` during build, but you need to push the schema:

1. Go to Vercel project → Settings → Environment Variables
2. Copy the `DATABASE_URL` value
3. In your local `.env.local`:
   ```
   DATABASE_URL="your-vercel-postgres-url"
   ```
4. Run:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

---

## Step 4: Update NEXTAUTH_URL

After first deployment, update the environment variable:

1. Go to Vercel project → Settings → Environment Variables
2. Edit `NEXTAUTH_URL` to your production URL:
   ```
   NEXTAUTH_URL=https://supply-chain-simulator.vercel.app
   ```
3. Redeploy (trigger via Settings → Deployments → Redeploy)

---

## Step 5: Verify Deployment

1. Visit your production URL: `https://your-app-name.vercel.app`
2. Navigate to `/admin/scenarios` to see the Scenario UI
3. Check database connection:
   - Go to Vercel → Storage → your-database → Query
   - Run: `SELECT * FROM "Organization";` (should be empty but no error)

---

## Step 6: Seed Test Data (Optional)

Create test data to verify the calculation engine:

```bash
# Create seed script
npx prisma db seed
```

Or manually via Prisma Studio:
```bash
vercel env pull .env.local
npx prisma studio
```

Then create:
1. **Organization** (slug: `demo-org`)
2. **User** (email: `demo@example.com`, role: `ADMIN`)
3. **Variables**:
   - `INPUT_UNIT_COST` (INPUT, no formula)
   - `INPUT_QUANTITY` (INPUT, no formula)
   - `OUTPUT_TOTAL_COST` (OUTPUT, formula: `INPUT_UNIT_COST * INPUT_QUANTITY`)
4. **Parameter**:
   - `PARAM_TAX_RATE` (value: 20)
5. **Scenario** (isBaseline: true)
6. **VariableValues** for the scenario:
   - INPUT_UNIT_COST = 50
   - INPUT_QUANTITY = 100

---

## Production URL

After deployment, your app will be available at:

**🚀 https://[your-project-name].vercel.app**

---

## Continuous Deployment

Vercel automatically redeploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Your changes"
git push origin phase1-foundation

# Vercel automatically deploys (watch at vercel.com/dashboard)
```

---

## Monitoring & Logs

- **Deployment Logs**: Vercel Dashboard → Deployments → [deployment] → Building
- **Runtime Logs**: Vercel Dashboard → Deployments → [deployment] → Functions
- **Database Queries**: Vercel Dashboard → Storage → [database] → Insights

---

## Troubleshooting

### Build Fails: "Prisma Client Not Generated"
- **Cause**: `prisma generate` not running during build
- **Fix**: Ensure vercel.json has: `"buildCommand": "prisma generate && next build"`

### Runtime Error: "Can't reach database server"
- **Cause**: DATABASE_URL not set or incorrect
- **Fix**: Check Settings → Environment Variables → DATABASE_URL exists

### NextAuth Error: "Missing NEXTAUTH_SECRET"
- **Cause**: Environment variable not set
- **Fix**: Add `NEXTAUTH_SECRET` in Vercel project settings

### Schema Not Applied: "Table doesn't exist"
- **Cause**: Prisma schema not pushed to database
- **Fix**: Run `npx prisma db push` with production DATABASE_URL

---

## Next Steps After Deployment

1. **Test Calculation Engine**:
   - Create variables in UI (Phase 1.6)
   - Set values for a scenario
   - Call `calculation.calculate` mutation
   - Verify results in database

2. **Build Variable Management UI** (Phase 1.6)
3. **Add Authentication** (login/signup pages)
4. **Implement Effect Curves** (Phase 3)
5. **Build Comparison UI** (Phase 5)

---

**Last Updated**: 2024-01-15
**Status**: Ready for production deployment
