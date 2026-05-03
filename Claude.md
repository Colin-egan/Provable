# CLAUDE.md

## Project Overview

CausalMail is a web application that lets small business owners run randomized email experiments and measure the causal impact of their email campaigns on revenue. Users upload a customer list, write an email, and the platform handles randomization, sending, tracking, and statistical analysis — presenting results in plain English.

**Full product specification:** See `SPEC.md` in the project root. Read it before making architectural decisions.

---

## Tech Stack

- **Framework:** Next.js 14, App Router, TypeScript (strict mode)
- **Database:** PostgreSQL via Supabase
- **ORM:** Prisma (`prisma/schema.prisma` is the source of truth for the data model)
- **Styling:** Tailwind CSS + shadcn/ui
- **Auth:** Supabase Auth (email/password + Google OAuth)
- **Email:** Resend API (Phase 2+)
- **CSV Parsing:** Papa Parse (client-side only)
- **Charts:** Recharts
- **Statistics:** Pure TypeScript — no external stats libraries, no Python
- **Hosting:** Vercel

---

## Project Structure


---

## Current Build Phase

**Phase 1: Core MVP (Weeks 1–4)**

In scope right now:
- Landing page (`/`)
- Auth (`/login`, `/signup`)
- Dashboard (`/dashboard`)
- Study creation with CSV upload (`/studies/new`)
- Randomization using `crypto.getRandomValues`
- Manual revenue entry on study detail page
- ITT calculation and results display
- Single study view (`/studies/[id]`)

**NOT in scope yet (do not build unless explicitly asked):**
- Email sending via Resend (Phase 2)
- Webhook handler (Phase 2)
- LATE calculation (Phase 2)
- Multi-campaign dashboard, trend charts, insights (Phase 3)
- Shopify/Stripe/Square integrations (Phase 4)
- Multi-variant testing, segmentation, PDF reports (Phase 5)
- Python microservice (only if matrix algebra or iterative sampling is needed — not anticipated)

---

## Code Conventions

### TypeScript
- Strict mode. No `any` types unless absolutely unavoidable and commented why.
- Prefer `interface` over `type` for object shapes.
- Use Zod for runtime validation of user inputs (CSV data, form submissions, API payloads).
- Server actions go in `src/actions/`. They are the only place that touches the database.
- All database calls go through the Prisma client exported from `src/lib/db.ts`.

### React / Next.js
- Default to Server Components. Only use `"use client"` when the component needs interactivity (forms, state, event handlers, browser APIs).
- Use Next.js App Router conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`.
- Protect routes by checking auth in the layout or page server component — redirect to `/login` if unauthenticated.
- Prefer server actions over API routes for mutations. API routes are only for webhooks and external integrations.

### Styling
- Use Tailwind utility classes. No custom CSS files unless absolutely necessary.
- Use shadcn/ui components from `src/components/ui/`. Install new ones with `npx shadcn-ui@latest add <component>`.
- Follow shadcn/ui patterns for component composition (e.g., `<Card>`, `<CardHeader>`, `<CardContent>`).
- Responsive by default: mobile-first, then `sm:`, `md:`, `lg:` breakpoints.

### Statistics (`src/lib/stats.ts`)
- All statistical calculations are pure TypeScript functions with no external dependencies.
- ITT: difference in means, Welch's t-test, 95% CI (±1.96 SE), p-value from normal approximation.
- LATE: Wald estimator (ITT / first-stage difference), delta method SE, F-statistic.
- Every stats function must return a typed result object, never raw numbers.
- Never surface statistical jargon in the UI. Use `src/lib/interpret.ts` to convert stats results into plain-English strings.

### Plain English Rule
- The words "instrumental variable," "heteroskedasticity," "regression," "coefficient," and "p-value" must NEVER appear in any user-facing string.
- Use "effect of sending the email" instead of "ITT."
- Use "effect of reading the email" instead of "LATE."
- Use "we're X% confident" instead of "confidence interval."
- Use "statistically significant" sparingly — prefer "we detected a real effect" or "we couldn't detect a clear effect."

---

## Key Files Reference

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Data model — read this first |
| `src/lib/stats.ts` | All statistical calculations |
| `src/lib/interpret.ts` | Converts stats results → plain English |
| `src/lib/randomize.ts` | Crypto-secure group assignment |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/resend.ts` | Email sending wrapper (Phase 2) |
| `src/actions/studies.ts` | CRUD for studies |
| `src/actions/customers.ts` | Import customers, update revenue |
| `src/actions/calculate-results.ts` | Run stats engine and save results |
| `src/actions/send-emails.ts` | Trigger email campaign (Phase 2) |

---

## Database

- Run `npx prisma migrate dev` after any schema change.
- Run `npx prisma generate` to regenerate the client after schema changes.
- Use `npx prisma studio` to inspect data during development.
- Connection strings are in `.env.local` (`DATABASE_URL` and `DIRECT_URL`).
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

---

## Environment Variables

Required in `.env.local`: