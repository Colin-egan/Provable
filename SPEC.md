# Provable 

## What This Is

Provable is a web application that lets small business owners run randomized email experiments and measure the causal impact of their email campaigns on revenue. Users upload a customer list, write an email, and the platform handles randomization, sending, tracking, and statistical analysis — presenting results in plain English that anyone can act on without knowing econometrics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 with App Router and TypeScript |
| **Database** | PostgreSQL via Supabase (free tier to start) |
| **ORM** | Prisma |
| **Styling** | Tailwind CSS with shadcn/ui component library |
| **Auth** | Supabase Auth |
| **Email Sending** | Resend API (free tier: 3,000 emails/month, upgrade to SendGrid at scale) |
| **CSV Parsing** | Papa Parse (client-side) |
| **Charts** | Recharts (campaign comparison over time) |
| **Statistics** | TypeScript, computed in server actions with no external dependencies |
| **Hosting** | Vercel for the full Next.js app |

> **Future Python Microservice:** Only if and when full 2SLS with covariates, Bayesian analysis, or heterogeneous treatment effects are needed. Not in MVP. Not in V2. **Decision rule:** if the calculation requires matrix algebra or iterative sampling, move it to a FastAPI service on Railway.

---

## Data Model

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  studies   Study[]
  createdAt DateTime @default(now())
}

model Study {
  id                String       @id @default(cuid())
  name              String
  userId            String
  user              User         @relation(fields: [userId], references: [id])
  status            StudyStatus  @default(DRAFT)
  treatmentPct      Float        @default(0.5)
  outcomeWindowDays Int          @default(7)
  emailSubject      String?
  emailBody         String?
  customers         Customer[]
  results           StudyResult?
  createdAt         DateTime     @default(now())
  launchedAt        DateTime?
  completedAt       DateTime?
}

model Customer {
  id             String    @id @default(cuid())
  studyId        String
  study          Study     @relation(fields: [studyId], references: [id])
  email          String
  externalId     String?
  group          GroupType?
  emailSentAt    DateTime?
  emailOpenedAt  DateTime?
  emailClickedAt DateTime?
  clickedUrl     String?
  emailBounced   Boolean   @default(false)
  revenue        Float?
  createdAt      DateTime  @default(now())
}

model StudyResult {
  id                  String   @id @default(cuid())
  studyId             String   @unique
  study               Study    @relation(fields: [studyId], references: [id])
  ittEstimate         Float?
  ittSe               Float?
  ittCiLower          Float?
  ittCiUpper          Float?
  ittPValue           Float?
  ittSignificant      Boolean?
  lateEstimate        Float?
  lateSe              Float?
  lateCiLower         Float?
  lateCiUpper         Float?
  firstStageF         Float?
  weakInstrument      Boolean?
  openRateTreatment   Float?
  openRateControl     Float?
  nTreatment          Int?
  nControl            Int?
  warnings            String[]
  computedAt          DateTime @default(now())
}

enum StudyStatus {
  DRAFT
  RANDOMIZED
  SENDING
  COLLECTING
  COMPLETED
}

enum GroupType {
  TREATMENT
  CONTROL
}
```

---

## Pages and Routes

### Landing Page — `/`

A single marketing page explaining the product.

- **Headline:** "Find out if your emails actually cause sales."
- **Subheadline:** "Upload your customer list, send an email to a random half, and we'll tell you exactly how much revenue it caused — not just who clicked."
- **Call to action button:** "Start Your First Study" → links to signup.
- **Below the fold:** A three-step visual (**Upload → Send → Learn**) and a sample results card showing what the output looks like.
- No pricing on MVP — it's free during beta.

### Auth — `/login` and `/signup`

- Supabase Auth with email and password.
- Google OAuth as an option.
- After signup, redirect to `/dashboard`.

### Dashboard — `/dashboard` *(protected)*

The main hub after login.

**Top row — Summary stats across all studies:**
- Total studies run
- Total customers randomized
- Average ITT effect
- Best-performing campaign

**Study table** with columns:

| Column | Details |
|---|---|
| Study name | — |
| Date created | — |
| Status | Badge |
| Number of customers | — |
| ITT estimate | Color-coded: 🟢 significant positive, 🔴 significant negative, ⚪ not significant |
| 95% confidence interval | — |
| Open rate | — |

Each row is clickable → links to `/studies/[id]`.

**Trend chart** (Recharts line chart):
- ITT estimates over time with shaded confidence interval bands
- X-axis: campaign date
- Y-axis: estimated causal effect in dollars

**Auto-generated insights section** with plain-English observations:
- *"Your most effective campaign was [name] with a $X.XX effect per customer."*
- *"Your email effectiveness has increased/decreased over the last N campaigns."*
- *"Based on your typical effect sizes, you need at least X customers per group to reliably detect results."*

### New Study — `/studies/new` *(protected)*

A multi-step form with a progress indicator at the top.

#### Step 1: Upload Your Customer List

- Drag-and-drop zone that accepts CSV files.
- Uses Papa Parse to parse client-side.
- Expects a column called `email` (required) and optionally `customer_id` or `external_id`.
- After upload, shows:
  - Preview table of the first 10 rows
  - Count of total valid rows
  - Count of invalid or duplicate emails that will be excluded
  - ⚠️ Warning if the list is under 200 (explaining that results may be imprecise)
- **Continue** button.

#### Step 2: Write Your Email

- Text input for **subject line**.
- Rich text editor (or simple textarea for MVP) for **email body**.
- Note: *"This email will only be sent to the treatment group. The control group will not receive anything."*
- **Continue** button.

#### Step 3: Configure Your Study

- Text input for **study name**.
- **Slider** for treatment percentage:
  - Default: 50%
  - Range: 10%–90%
  - Dynamic sentence: *"X customers will receive your email. Y customers will be the control group and will not receive anything."*
- **Dropdown** for outcome window: 3 days, **7 days** (default), 14 days, or 30 days.
  - Note: *"This is how long we'll wait after sending before calculating results. Choose based on how quickly your customers typically make purchases."*
- **Continue** button.

#### Step 4: Review and Randomize

- Summary card showing all choices: list size, email subject, treatment/control split, outcome window.
- Prominent button: **"Randomize and Create Study"**
- On click, the server action:
  1. Saves all customers to the database
  2. Performs randomization using `crypto.getRandomValues` for proper randomness
  3. Assigns each customer to `TREATMENT` or `CONTROL`
  4. Saves the study with status `RANDOMIZED`
- After completion: confirmation screen with exact group counts and a button to proceed to the study page.

### Study Detail — `/studies/[id]` *(protected)*

This page has different states depending on study status.

#### Status: `RANDOMIZED`

- Study summary (name, date, split).
- Customer table with tabs: **All**, **Treatment**, **Control**.
  - Columns: email, group (colored badge), revenue (empty), opened (empty), clicked (empty).
- Prominent **"Send Emails"** button.
  - Confirmation dialog: *"This will send your email to X customers in the treatment group. The control group will not receive anything. This cannot be undone."*
  - On confirm: sends emails via Resend API in batches of 50 with 1-second delays.
  - Each email includes tags for `studyId` and `customerId` for webhook tracking.
  - All links appended with UTM parameters: `utm_source=causalmail`, `utm_campaign=[studyId]`, `utm_id=[customerId]`.
  - Study status changes to `SENDING`, then to `COLLECTING` when all emails are sent.

#### Status: `COLLECTING`

- Customer table now shows real-time tracking data populated by webhooks:
  - Email delivered timestamp
  - Email opened timestamp
  - Email clicked timestamp
- **Tracking summary panel** at the top:
  - Emails sent, delivered, opened (ℹ️ Apple Mail privacy note), clicked, bounced
  - Auto-refreshes every 30 seconds
- **Revenue column** is editable — users can click a cell and type a dollar amount.
- **"Bulk Import Revenue"** button: accepts a CSV with columns `email` and `revenue`.
- Countdown/date showing when the outcome window closes.
- **"Calculate Results"** button:
  - Becomes prominent when the outcome window has passed.
  - Available at any time with warning if clicked early: *"Your outcome window hasn't closed yet. Results may change as more purchases come in."*

#### Status: `COMPLETED`

- Results panel displayed prominently at the top.
- Full customer table with all data.
- **"Export Data"** button: downloads a CSV of all customer-level data including group assignment, tracking events, and revenue.

### Results Panel Design

Three cards in a row:

#### Card 1 — ITT Effect

> *"Sending your email caused an estimated **$X.XX** change in spending per customer."*

- 95% confident the true effect is between $X.XX and $X.XX.
- P-value and whether the result is statistically significant.
- **Color:**
  - 🟢 Green background → significant and positive
  - 🔴 Red background → significant and negative
  - ⚪ Gray background → not significant
- **Plain-English interpretation:**
  - If significant positive: *"This email worked. It caused real additional revenue."*
  - If not significant: *"We couldn't detect a clear effect. The email may have had too small an impact to measure with this sample size, or it may not have worked. Try a larger list or a stronger offer."*

#### Card 2 — LATE Effect *(only shown if open or click data exists)*

> *"For customers who engaged with the email because you sent it, the estimated effect was **$X.XX** per person."*

- First-stage F-statistic with plain explanation:
  - **F > 10:** *"Strong instrument — this estimate is reliable."*
  - **F between 5 and 10:** *"Moderate instrument strength — interpret with some caution."*
  - **F < 5:** *"Weak instrument — this estimate is unreliable. Focus on the ITT estimate instead."*
- ℹ️ Tooltip: *"This estimates the effect for people who actually read your email, not just everyone you sent it to. It's always larger than the ITT because it focuses on the people who engaged."*

#### Card 3 — Study Diagnostics

- Sample sizes per group
- Open rate in treatment vs. control
- Click rate in treatment vs. control
- Bounce rate
- Any warnings generated by the stats engine (small sample size, Apple Mail contamination in control group, weak instrument)

**Below the cards**, if this is not the user's first study:
> *"Compared to your previous campaign, this email was $X.XX more/less effective per customer."*

---

## Email Sending and Tracking

### Sending

- All emails sent through the **Resend API**.
- Each email sent individually (not in bulk) so each can be tagged with the specific `customerId` for webhook tracking.
- Sent in batches of 50 with a 1-second pause between batches to respect rate limits.
- From address: `study@causalmail.com` for MVP.
- Future: users can verify their own domain for better deliverability.

### Webhook Endpoint — `/api/webhooks/email`

- Receives POST requests from Resend when email events occur.
- Verifies the webhook signature using the **Svix** library for security.
- Handles these event types:

| Event | Action |
|---|---|
| `email.delivered` | Updates `emailSentAt` on the customer record |
| `email.opened` | Updates `emailOpenedAt` |
| `email.clicked` | Updates `emailClickedAt` and stores the clicked URL |
| `email.bounced` | Sets `emailBounced` to `true` |

All timestamps come from the webhook payload, not from the server clock.

### Open Tracking Limitations

Open tracking relies on a tracking pixel that email clients load. **Apple Mail Privacy Protection** pre-loads all tracking pixels, meaning Apple Mail users will appear to have opened the email even if they didn't. This inflates open rates and can contaminate the control group if any control group members somehow show opens (which shouldn't happen since they weren't sent an email, but is worth checking as a data quality signal).

> ⚠️ **Always show this disclaimer next to open rate data:** *"Open tracking is approximate. Apple Mail and some email clients may inflate these numbers. Click tracking is more reliable."*

For the LATE estimate, offer users the choice of using **opens** or **clicks** as the engagement variable, with a recommendation to use clicks.

### Website Visit Tracking

For MVP, the email click event from Resend serves as a proxy for "visited the website." All links in the email are appended with UTM parameters so that if the user has Google Analytics or Shopify Analytics, they can see the tagged traffic there.

**Future:** Offer an optional JavaScript snippet that users can add to their website for deeper page-level tracking and conversion attribution.

---

## Statistics Engine

All statistical calculations are performed in TypeScript within server actions. No external services, no Python, no additional infrastructure.

### ITT Calculation

- Difference in mean revenue between treatment and control groups.
- Standard error computed using **Welch's formula** (unequal variances).
- 95% confidence interval using ±1.96 standard errors.
- P-value approximated from the t-statistic using a normal approximation (valid for the sample sizes these studies will have — typically 100+ per group).
- Statistical significance determined by whether the confidence interval excludes zero.

### LATE Calculation

- **Wald estimator:** ITT estimate divided by the difference in engagement rates between treatment and control.
- Standard error computed using the **delta method**.
- First-stage F-statistic computed as the squared t-statistic on the engagement rate difference.
- Weak instrument flag set if F < 10.
- If the first-stage difference is essentially zero (< 0.001), LATE is not computed and the user is shown a message explaining that engagement rates were too similar between groups.

### Warnings and Diagnostics

The stats engine generates plain-English warnings for:

- Sample sizes under 200 per group
- Weak instruments (F < 10)
- Control group showing nonzero open rates (suggesting Apple Mail contamination)
- Very large LATE estimates relative to ITT (suggesting the engagement measure may be noisy)
- Outcome window not yet closed at time of calculation

### Cross-Campaign Analysis

When a user has multiple completed studies, compute:

1. **Trend** in ITT estimates over time (simple linear regression of ITT on campaign date)
2. **Best and worst** performing campaigns
3. **Average effect size** (used to generate sample size recommendations for future studies)
4. **Pooled estimate** across campaigns using inverse-variance weighting

All of this is straightforward arithmetic that stays in TypeScript.

---

## Control Group Design

The default approach is a **clean holdout**: the control group receives nothing during the study.

To make this palatable to business owners who don't want to skip customers, offer a **"Delayed Send"** option: after the outcome window closes and results are calculated, automatically send the same email to the control group. This way no customer permanently misses out, but the measurement window is clean.

> 💡 **Present this as the default with an explanation:** *"After your study completes, we'll send the email to the control group so no one misses your offer. This doesn't affect your results."*

---

## Build Phases

### Phase 1: Core MVP *(Weeks 1–4)*

- Landing page, auth, study creation with CSV upload
- Randomization
- Manual revenue entry (no email sending yet — user sends emails through their own tool and just uses CausalMail for randomization and analysis)
- ITT calculation and results display
- Single study view

> This is the minimum needed to validate that people want causal estimates from their email campaigns.

### Phase 2: Email Integration *(Weeks 5–8)*

- Resend integration for sending emails directly from the platform
- Webhook handler for delivery and engagement tracking
- Real-time tracking dashboard on the study page
- LATE calculation using tracked engagement data
- Bulk revenue import via CSV

### Phase 3: Campaign Comparison *(Weeks 9–12)*

- Multi-campaign dashboard with summary stats
- ITT trend chart over time with confidence bands
- Auto-generated insights and recommendations
- Cross-campaign comparison table
- Sample size recommendations based on historical effect sizes

### Phase 4: Revenue Integrations *(Weeks 13–18)*

- Shopify API integration to automatically pull post-email purchase data
- Stripe integration for revenue tracking
- Square integration
- Automatic study completion when outcome window closes with revenue data populated
- Elimination of manual revenue entry for connected stores

### Phase 5: Advanced Features *(Weeks 19+)*

- Multi-variant testing (compare 3+ email versions in one study)
- Customer segmentation analysis (does the email work better for repeat buyers?)
- JavaScript website tracking snippet for downstream causal chain analysis
- Website redesign impact reports using email randomization as an instrument
- Exportable PDF reports
- Team accounts
- Python microservice for any advanced statistical methods that TypeScript can't handle cleanly

---

## File Structure

```
causalmail/
├── prisma/
│   └── schema.prisma
├── public/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                          # landing page
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── studies/
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── api/
│   │       └── webhooks/
│   │           └── email/
│   │               └── route.ts
│   ├── components/
│   │   ├── ui/                               # shadcn components
│   │   ├── study/
│   │   │   ├── csv-upload.tsx
│   │   │   ├── email-editor.tsx
│   │   │   ├── study-config.tsx
│   │   │   ├── study-review.tsx
│   │   │   ├── customer-table.tsx
│   │   │   ├── tracking-panel.tsx
│   │   │   └── results-panel.tsx
│   │   └── dashboard/
│   │       ├── study-table.tsx
│   │       ├── trend-chart.tsx
│   │       └── insights.tsx
│   ├── lib/
│   │   ├── db.ts                             # Prisma client
│   │   ├── stats.ts                          # all statistical calculations
│   │   ├── resend.ts                         # email sending wrapper
│   │   ├── randomize.ts                      # crypto-secure randomization
│   │   └── interpret.ts                      # stats to plain English
│   └── actions/
│       ├── studies.ts                        # create, update, delete studies
│       ├── customers.ts                      # import, update revenue
│       ├── send-emails.ts                    # trigger email campaign
│       └── calculate-results.ts              # run stats and save
├──.env.local
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Environment Variables

```env
DATABASE_URL=                    # Supabase PostgreSQL connection string
DIRECT_URL=                      # Supabase direct connection for migrations
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=       # Supabase service role key for server-side auth
RESEND_API_KEY=                  # Resend API key (added in Phase 2)
RESEND_WEBHOOK_SECRET=           # Resend webhook signing secret (added in Phase 2)
```

---

## Key Design Principles

### Plain English Everywhere

No statistical jargon in the UI. Every number is accompanied by a sentence explaining what it means and what the user should do about it. The word "instrumental variable" never appears in the product. The user sees **"effect of sending the email"** (ITT) and **"effect of reading the email"** (LATE).

### Honest About Uncertainty

When results are not significant, say so clearly and explain why (usually sample size). When assumptions are shaky (Apple Mail, weak instrument), flag it visibly. Never overstate what the data supports. This builds trust and differentiates from tools that just show green arrows on everything.

### Progressive Disclosure

The default view shows the ITT result — one number, one sentence. Users who want more can expand to see the LATE, diagnostics, and warnings. Users who want the raw data can export it. Don't overwhelm on first contact.

### Data Compounds

Every study a user runs makes the dashboard more valuable. Cross-campaign comparisons, trend lines, and sample size recommendations all improve with more data. This creates natural retention and switching costs.