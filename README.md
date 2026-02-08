# OFF-Boarder (OffboardHQ)

**Security-first employee offboarding orchestration for modern organizations.**  
OFF-Boarder helps teams run structured, auditable offboarding workflows with built-in risk controls, evidence capture, and compliance reporting.

---

## What problem this solves

Employee offboarding is often fragmented across HR, IT, Security, and Operations. In many teams, critical actions (like access revocation, asset return, and legal attestations) are tracked in spreadsheets, chats, or disconnected tools.

That creates security and compliance risk:
- orphaned account access
- missing approval trails
- weak proof collection
- poor incident response when risk spikes during an exit

OFF-Boarder centralizes the full offboarding lifecycle in one multi-tenant platform so organizations can **reduce insider risk**, **improve operational consistency**, and **produce audit-ready evidence**.

---

## Key features

### 1) Multi-tenant org + membership model
- Organization-scoped data model (Prisma + Postgres)
- Membership and role system (`OWNER`, `ADMIN`, `CONTRIBUTOR`, `AUDITOR`)
- Invitation + join flow
- Platform-level administration across tenants (`/admin`)

### 2) Offboarding lifecycle orchestration
- End-to-end case management (`PENDING`, `IN_PROGRESS`, `PENDING_APPROVAL`, `COMPLETED`, `CANCELLED`)
- Task lifecycle with assignees, due dates, and completion tracking
- Approval flow support (task/offboarding/high-risk approvals)

### 3) Workflow templates + task engine
- Organization-level workflow templates
- Ordered template task definitions with evidence requirements
- Per-case task generation and operational progress tracking

### 4) Risk Radar (security & response)
- Dynamic risk scoring with weighted factors
- Case escalation and approval escalation
- Lockdown controls for critical cases
- IP ban/unban workflow and related event tracking
- Risk dashboard + case detail views (`/app/risk-radar`)

### 5) Access revocation tracking
- Per-system revocation records with status lifecycle
- Urgency and due-date support
- Confirmation actions with audit/security events

### 6) Asset recovery + proof collection
- Asset assignment + return tracking
- Return proof capture (images/PDF metadata paths)
- Status tracking (`PENDING`, `RETURNED`, `VERIFIED`, etc.)

### 7) Evidence management + Evidence Pack PDF
- Task-level evidence (`FILE`, `LINK`, `NOTE`, `SYSTEM_PROOF`)
- Evidence requirement compliance checks
- Evidence pack generation endpoint (`/api/offboardings/[id]/evidence-pack`)
- Sealing/immutability workflow for evidence pack records

### 8) Employee portal (subject portal)
- Employee-linked portal access model
- Employee task, attestation, and timeline surfaces
- Employee-specific asset/proof and notification flows

### 9) Audit logging + reporting surfaces
- Structured organization audit logs
- Platform audit logs for cross-tenant actions
- Reports module pages for compliance/offboarding/task and directory views

### 10) Integrations
- Slack webhook integration
- Email integration/testing flows
- Resend-backed email delivery utilities

---

## Tech stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI:** MUI + Tailwind CSS
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Auth / session ecosystem:** Supabase Auth + custom session handling
- **Storage:** Supabase Storage (evidence and asset proof uploads)
- **Email:** Resend
- **PDF generation:** `jspdf` + `jspdf-autotable`
- **Testing:** Vitest

---

## Architecture overview

### Frontend
- App Router pages under `src/app`
- Primary product area under `src/app/app/*`
- Platform admin area under `src/app/admin/*`
- Domain UI components in `src/components/*`

### Backend (API routes + server actions)
- **API routes:** `src/app/api/*` for route-based operations (uploads, auth setup, evidence-pack export, etc.)
- **Server actions:** `src/lib/actions/*` for domain logic (risk radar, offboardings, integrations, workflows, evidence, approvals, etc.)
- Role checks and invariant enforcement in `src/lib/rbac.server.ts`

### Database (Prisma + Postgres)
- Schema source: `prisma/schema.prisma`
- Rich domain models for orgs, memberships, employees, offboardings, tasks, approvals, risk, evidence, audit, policies, and platform admin
- Prisma config: `prisma.config.ts`

### Auth (Supabase)
- Supabase auth/session wiring in `src/lib/supabase/*`
- Middleware entrypoint in `src/middleware.ts`
- Auth setup route in `src/app/api/auth/setup/route.ts`

### Storage (Supabase buckets)
- Evidence uploads via service-role-backed routes (example: `src/app/api/upload/evidence/route.ts`)
- Asset-proof uploads via service-role-backed routes (example: `src/app/api/upload/asset-proof/route.ts`)
- Buckets referenced in code include:
  - `evidence-files`
  - `asset-proofs`

---

## Screenshots

> Add actual screenshots as they become available.

- `docs/screenshots/risk-radar-dashboard.png`
- `docs/screenshots/offboarding-case-detail.png`
- `docs/screenshots/evidence-pack-export.png`
- `docs/screenshots/platform-admin-console.png`

---

## Local setup

### Prerequisites
- Node.js 20+
- npm (or Bun, if you prefer)
- PostgreSQL instance
- Supabase project (Auth + Storage)

### Install
```bash
npm install
```

### Environment variables (names only)
Create a `.env` file and provide values for:

```bash
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

RESEND_API_KEY=
EMAIL_FROM=
ENABLE_EMAIL_NOTIFICATIONS=

PG_POOL_MAX=
PG_POOL_IDLE_TIMEOUT_MS=
PG_POOL_CONNECTION_TIMEOUT_MS=
PG_POOL_MAX_USES=

NODE_ENV=
```

### Prisma steps
```bash
npx prisma generate
npx prisma migrate dev
```

Optional (demo/dev helpers):
```bash
npm run reset-to-demo
# or
npm run dev-reset
```

### Supabase notes
- Ensure your Supabase project is configured for Auth.
- Create the storage buckets referenced by upload routes (`evidence-files`, `asset-proofs`) with appropriate policies.
- Service role key is required for server-side upload routes.

### Run locally
```bash
npm run dev
```

Open: `http://localhost:3000`

---

## Available scripts

From `package.json`:

- `npm run dev` – start development server
- `npm run build` – build production bundle
- `npm run start` – run production server
- `npm run lint` – run ESLint
- `npm run test` – run Vitest in watch mode
- `npm run test:run` – run Vitest once
- `npm run test:security` – run security-focused test file
- `npm run reset-to-demo` – reset environment to demo state
- `npm run dev-reset` – development reset helper

---

## Security notes

### Evidence uploads via service role
- Evidence and asset-proof upload endpoints use Supabase service role credentials server-side.
- Keep `SUPABASE_SERVICE_ROLE_KEY` private and never expose it client-side.

### RBAC and invariant controls
- Role/permission checks enforced in server-side logic (`src/lib/rbac.server.ts`).
- Invariant protections include subject/approver/assignee safeguards on offboarding operations.

### Audit logs
- Organization-level and platform-level audit models exist in schema.
- Sensitive lifecycle actions (risk updates, evidence export/seal, integrations, etc.) are logged.

---

## Roadmap (realistic next steps)

Based on current repository state:

- Add real product screenshots and walkthrough GIFs under `docs/screenshots/`
- Expand public docs for deployment, backup/restore, and incident-response runbooks
- Add stronger CI checks for migrations, RLS/policy validation, and end-to-end workflow coverage
- Improve setup UX with a canonical `.env.example` and bootstrap docs

---
## Contact / LinkedIn

- GitHub: [@Rytnix786](https://github.com/Rytnix786)
- LinkedIn: _Add your LinkedIn profile URL here_
