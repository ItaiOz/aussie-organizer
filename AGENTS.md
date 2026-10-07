# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Project overview

Aussie Organizer is the owner's internal admin app for a multi-location retail business in Australian shopping centers. It is single-tenant and used daily, mostly from phones. Favor shipping the everyday workflows (sales entry, expenses, dashboard) over completeness.

Stack: Next.js 16 (App Router, `src/proxy.ts` instead of middleware), TypeScript, Tailwind v4, Prisma 6 + Postgres (Neon), NextAuth v5 credentials/JWT, deployed on Vercel. See [README.md](README.md) for setup and layout.

## Ground rules

- **The `.env` database is production.** Real sales and expenses entered daily by staff. Never run `db:reset`, `db:seed`, or destructive SQL. Schema changes must be additive (defaults on new required columns). Delete any test rows you create.
- **Auth is a few username/password accounts.** No signup, password reset, email auth, or per-employee logins. Employees are records, not users. Create or reset accounts with `node scripts/create-user.js <user> <pass> [role]`.
- **Roles:** `admin` / `manager` see the whole app; `staff` is locked to `/entry` (enforced in `auth.config.ts`).
- **Keep models minimal.** Add only fields the owner asks for. Example: `Expense` deliberately has no `centerId`.
- **Money is AUD only.** Format with `money()` from `src/lib/format.ts`.
- **Dates are calendar dates stored at UTC midnight.** Parse form values with `dateOnlyUTC()`; never use local-time midnight (that bug was fixed once with `scripts/fix-dates.js`).
- **No git writes** (add/commit/push) unless asked.
- After `prisma migrate dev`, restart `next dev`: the Prisma client is cached on `globalThis`.

## Features and status

| Area | Route | Status |
|---|---|---|
| Leasing pipeline: kanban need_to_contact → contacted → booked. Only `booked` centers are operational. | `/centers` | done |
| Employees (hourly rate, commission rate) | `/employees` | done |
| Daily sales: one `DailySale` per center+date (cash/card/refund), optional per-salesperson `EmployeeSale` split, optional `DailySaleExpense` lines. Weekly by-center pivot + last-30-days tab. | `/sales` | done |
| Staff entry screen: phone form for end-of-shift sales. Own entries are editable until the browser session ends (session cookie); duplicate center+date is blocked. | `/entry` | done |
| Expenses: fixed categories in `expenses/categories.ts`, totals, paid-by | `/expenses` | done |
| Dashboard: KPIs + sales chart | `/dashboard` | done |
| Weekly payroll: base hours × rate + commission + bonuses − deductions (incl. rent share) | `/payroll` | basic |
| Apartments (employee housing) + assignments | `/apartments` | basic |
| Inventory, suppliers | `/inventory`, `/suppliers` | read-only lists |
| Purchase orders, settings | `/orders`, `/settings` | stubs |

Not built yet: shift/hours tracking (payroll depends on it), automatic rent-share deduction in payroll, purchase orders, full shift calendar. Sales are entered manually; there is no POS integration.

## Code map

- `src/app/(app)/<area>/`: manager pages. Each has `page.tsx` (server component querying Prisma) + `actions.ts` (server actions) + dialog components.
- `src/app/(staff)/entry/`: staff entry screen.
- `auth.ts` (Node, Prisma) / `auth.config.ts` (edge-safe, role routing) / `src/proxy.ts`.
- `prisma/schema.prisma`: models. `src/lib/format.ts`: money/date helpers.
- `next.config.ts` `allowedDevOrigins` lets phones on the LAN use the dev server.
