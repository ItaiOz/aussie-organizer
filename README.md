# Aussie Organizer

Internal business manager for a multi-location retail operation in Australia.
Tracks shopping centers (leasing pipeline), employees, daily sales, weekly
payroll, and employee housing apartments.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Prisma 6 + Postgres
- NextAuth v5 (credentials, JWT sessions)
- Recharts for the dashboard
- @dnd-kit for the leasing-pipeline kanban

## Local development

```bash
cp .env.example .env       # then fill in DATABASE_URL + AUTH_SECRET
npm install
npm run db:migrate         # create local DB schema
npm run db:seed            # fake centers, employees, sales
npm run dev                # http://localhost:3000
```

Sign in with:

| Username   | Password    | Role    |
|------------|-------------|---------|
| `owner`    | `owner123`  | admin   |
| `manager1` | `manager123`| manager |
| `manager2` | `manager123`| manager |

**Change these passwords before sharing the deployed URL.**

## Deploying to Vercel + Neon (free tier)

1. **Create a Neon Postgres** at <https://neon.tech> → copy the connection string
2. **Create your first migration locally** against the Neon DB:
   ```bash
   echo 'DATABASE_URL="<your-neon-url>"' > .env.local
   DATABASE_URL="<your-neon-url>" npx prisma migrate dev --name init
   DATABASE_URL="<your-neon-url>" npm run db:seed
   ```
   Commit the generated `prisma/migrations/` folder.
3. **Push to GitHub**:
   ```bash
   git add . && git commit -m "Deploy-ready" && git push
   ```
4. **Import on Vercel** at <https://vercel.com/new>:
   - Add env vars:
     - `DATABASE_URL` — your Neon URL
     - `AUTH_SECRET` — generate with `openssl rand -base64 32`
     - `AUTH_TRUST_HOST` — `true`
   - Build command stays the project default (`npm run build` already runs `prisma migrate deploy && next build`)
5. **Deploy.** Future migrations: edit schema → `npx prisma migrate dev --name <change>` locally → commit → push.

## Project layout

```
auth.ts            NextAuth full config (uses Prisma, Node-only)
auth.config.ts     NextAuth edge-safe config (used by proxy)
prisma/
  schema.prisma    Models
  seed.ts          Seed data
src/
  app/
    (app)/         Authenticated pages (sidebar layout)
      dashboard/   KPI cards + sales chart
      centers/     Kanban leasing pipeline (drag-drop, edit, delete)
      employees/   Employees + sales rollup
      sales/       Daily sales entry (cash + credit), weekly by-center pivot
      payroll/     Weekly payroll — generate drafts, edit, mark paid
      apartments/  Employee housing + assignments
      inventory/   Stock-on-hand (global)
      orders/      (stub)
      suppliers/   Supplier directory
      settings/    (stub)
    login/         Sign-in page
    api/auth/      NextAuth handlers
  components/
    ui/            shadcn-style primitives
  lib/             prisma client, formatters
  proxy.ts        Auth proxy (Next.js 16)
```

## Useful scripts

```bash
npm run dev          # dev server (Turbopack)
npm run build        # prisma migrate deploy + next build
npm run db:migrate   # create/apply migrations
npm run db:reset     # nuke DB and re-run migrations + seed (local only)
npm run db:seed      # re-seed only
npm run db:studio    # Prisma Studio (browser DB GUI)
```
