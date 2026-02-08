# OFF-Boarder

**Security-first offboarding orchestration for multi-tenant organizations.**

[![CI](https://github.com/Rytnix786/OFF-Boarder/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Rytnix786/OFF-Boarder/actions/workflows/ci.yml)
[![Tests and Lint](https://github.com/Rytnix786/OFF-Boarder/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/Rytnix786/OFF-Boarder/actions/workflows/tests.yml)

OFF-Boarder is a Next.js + TypeScript platform for running employee offboarding with security controls built into the flow.  
It combines lifecycle orchestration, risk scoring, approvals, evidence capture, and audit trails in one system.  
The platform is multi-tenant by design, supports both organization-level and platform-level administration, and integrates with Supabase (Auth + Storage).  
The goal is operational reliability: every case is trackable, reviewable, and exportable for compliance.

## Why this exists

Offboarding is a security-critical process, not just an HR checklist. Delays in revoking access, weak approval controls, or missing evidence can directly create insider-risk exposure.

Spreadsheets and ad-hoc handoffs fail because they do not enforce role boundaries, do not preserve immutable evidence context, and do not produce a trustworthy security timeline when incidents happen.

OFF-Boarder addresses this by making offboarding stateful, auditable, and policy-aware.

## Core capabilities

### Offboarding workflow engine
- Status-driven offboarding lifecycle (`PENDING`, `IN_PROGRESS`, `PENDING_APPROVAL`, `COMPLETED`, `CANCELLED`)
- Workflow templates with ordered tasks
- Task assignment (user/employee), due dates, and completion tracking
- High-risk task flags and approval requirements

### Risk Radar / security operations
- Risk score calculation with weighted factors
- Risk levels (`NORMAL`, `HIGH`, `CRITICAL`) and re-scoring flows
- Escalation paths and lockdown actions
- Security event tracking and resolution
- IP ban/unban support tied to case/security activity

### Evidence & compliance
- Task evidence model (`FILE`, `LINK`, `NOTE`, `SYSTEM_PROOF`)
- Evidence requirement compliance checks per task
- Evidence Pack PDF export endpoint
- Evidence metadata including hashes/checksums in workflows

### Employee portal
- Subject portal access via employee-user link/invite model
- Employee task views and attestation flows
- Employee notifications and timeline surfaces

### Platform admin console
- Cross-tenant organization oversight in `/admin`
- Platform audit logs, policy views, signals, and support surfaces
- Org-level drill-down views (employees, offboardings, reports)

### Integrations & notifications
- Slack webhook integration flows
- Email integration/testing flows
- Resend-backed email delivery utilities

## Product walkthrough (high-level)

1. An organization creates (or applies) an offboarding workflow template.
2. A new offboarding case is created for an employee and tasks are generated.
3. Teams execute tasks (revocations, asset recovery, attestations) with evidence attached as required.
4. Risk Radar recalculates risk posture from task state, revocations, and security events.
5. If risk rises, the case can be escalated, locked down, and IP actions can be applied.
6. Approvals are collected according to role and risk requirements.
7. The case is finalized and an Evidence Pack PDF can be exported for compliance review.

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router UI                   │
│   - Org App (/app/*)          - Platform Admin (/admin/*)  │
│   - Employee Portal (/app/employee/*)                      │
└───────────────┬─────────────────────────────────────────────┘
                │ client requests / server actions
┌───────────────▼─────────────────────────────────────────────┐
│        Server Layer (Next.js Route Handlers + Actions)     │
│  - API routes: src/app/api/*                               │
│  - Server actions: src/lib/actions/*                       │
│  - RBAC + invariants + audit logging                       │
└───────┬──────────────────────────────┬──────────────────────┘
        │                              │
┌───────▼──────────────┐       ┌───────▼──────────────────────┐
│ Prisma + PostgreSQL  │       │ Supabase                      │
│ - core domain data   │       │ - Auth (session/user flows)  │
│ - org/tenant scoping │       │ - Storage (evidence-files,   │
│ - audit/risk/events  │       │   asset-proofs)              │
└───────┬──────────────┘       └──────────┬───────────────────┘
        │                                  │
        └───────────────┬──────────────────┘
                        ▼
               Evidence Pack PDF Export
      (/api/offboardings/[id]/evidence-pack via jsPDF)
```

### Server-side vs client-side
- **Client-side:** UI rendering, user interactions, dashboard components.
- **Server-side:** RBAC checks, lifecycle mutations, risk computation, file upload handling, audit writes, and PDF generation.

## Data model overview

High-level entity groups (from `prisma/schema.prisma`):

- **Identity & tenancy:** `User`, `Organization`, `Membership`, `Invitation`, `JoinRequest`
- **Offboarding core:** `Employee`, `Offboarding`, `OffboardingTask`, `WorkflowTemplate`, `WorkflowTemplateTask`, `Approval`
- **Security & risk:** `RiskScore`, `SecurityEvent`, `BlockedIP`, `BlockedIPAttempt`, `UserLockdown`, `SecurityPolicy`, `PolicyEnforcementLog`
- **Access/assets/evidence:** `AccessRevocation`, `Asset`, `AssetReturn`, `AssetReturnProof`, `TaskEvidence`, `AssetEvidence`, `EvidencePack`
- **Compliance & observability:** `AuditLog`, `PlatformAuditLog`, `MonitoringEvent`, `AnalyticsSnapshot`
- **Platform/admin support:** `PlatformSignal`, `PlatformStatus`, `SupportTicket`, enterprise conversation/message models

Relationship shape:
- One organization has many memberships, employees, offboardings, policies, and logs.
- One offboarding belongs to one employee + organization, and has many tasks/approvals/revocations/asset returns/events.
- Evidence records connect to tasks/assets/returns and are used in evidence pack generation.

## Security model

### RBAC roles
- System roles include `OWNER`, `ADMIN`, `CONTRIBUTOR`, `AUDITOR`.
- Permission checks are enforced server-side (`requirePermission`, role/invariant helpers).

### Segregation of duties
- Invariant enforcement prevents subjects from executing privileged actions on their own case (e.g., self-approve constraints).
- Additional assignment/approval constraints are implemented in RBAC invariant helpers.

### Audit logging
- Organization-level and platform-level audit models are present.
- High-risk actions (risk updates, integration triggers, evidence exports/seals, security actions) are logged.

### Evidence integrity notes
- Evidence workflows use hashes/checksum metadata in pack generation logic.
- Evidence pack sealing exists in the offboarding risk/evidence flow.

### Known security risk to manage
- `SUPABASE_SERVICE_ROLE_KEY` must remain server-side only.
- Upload routes use admin credentials; never expose service-role credentials to clients.

## API surface overview

Representative route groups (not exhaustive):

- **Auth/session/setup**
  - `/api/auth/*`
  - `/api/sessions/*`

- **Offboarding & evidence**
  - `/api/offboardings/*`
  - `/api/upload/evidence`
  - `/api/upload/asset-proof`
  - `/api/offboardings/[id]/evidence-pack`

- **Org operations**
  - `/api/employees/*`
  - `/api/organizations/*`
  - `/api/invitations/*`
  - `/api/join-requests/*`

- **Security/governance**
  - `/api/blocked-ips/*`
  - `/api/security-policies/*`
  - `/api/reports/*`
  - `/api/platform/*`

Auth and authorization expectations:
- Requests are session-aware (Supabase + server session handling).
- Mutating/privileged operations are guarded by server-side permission checks.

## Local development

### Prerequisites
- Node.js 20+
- npm
- PostgreSQL
- Supabase project (Auth + Storage)

### Install
```bash
npm ci
```

### Environment variables (names only)
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

### Prisma notes
- Prisma schema: `prisma/schema.prisma`
- Config: `prisma.config.ts`
- Generate client:
  ```bash
  npx prisma generate
  ```
- Apply local schema changes:
  ```bash
  npx prisma migrate dev
  ```

### Supabase notes
- Configure Supabase Auth for login/session flows.
- Create storage buckets used by routes:
  - `evidence-files` (confirmed)
  - `asset-proofs` (also used in upload routes)
- Keep service role credentials only in server environment.

### Commands to run
```bash
npm run dev
npm run lint
npm run test:security
npm run test:run
npm run build
```

## Testing

- Test runner: Vitest
- Security tests exist (`npm run test:security`)
- Full test command: `npm run test:run`
- CI includes lint, tests, and build checks via GitHub Actions
- No dedicated end-to-end test suite is currently present

## Deployment

Recommended approach:
- Deploy Next.js app on Vercel (or another Node-compatible host)
- Use managed PostgreSQL for production database
- Use Supabase for Auth and Storage integration

Repository state notes:
- CI workflows exist in `.github/workflows/ci.yml` and `.github/workflows/tests.yml`
- `Caddyfile` exists for reverse-proxy/server setups
- No Dockerfile is present
- No Terraform/IaC setup is present

## Roadmap

Realistic next steps based on current repository gaps:
- Add complete Prisma migration history to the repo
- Add worker/scheduler infrastructure for asynchronous jobs
- Add end-to-end test coverage for critical offboarding flows
- Improve permission consistency review across routes/actions
- Add Docker support for reproducible local/prod runtime
- Add Infrastructure as Code (Terraform or equivalent)

## License

MIT

## Author

- GitHub: [@Rytnix786](https://github.com/Rytnix786)
- LinkedIn: [Mehedi Hasan](https://www.linkedin.com/in/mehedi-hasan-rytnix786/)
