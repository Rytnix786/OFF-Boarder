## Project Summary
OffBoarder is a specialized platform for managing employee offboardings with a heavy focus on security, risk assessment, and compliance. It automates access revocation, asset recovery, and provides a "Risk Radar" dashboard to identify potential security threats during the offboarding process.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Runtime**: Node.js / Bun
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **UI/Styling**: Material UI (MUI), Tailwind CSS
- **Authentication**: Supabase Auth

## Architecture
- `src/app`: Next.js App Router pages and API routes.
- `src/components`: UI components, organized by domain (app, dashboard, layout, etc.).
- `src/lib`: Core logic including Prisma client, server actions, and third-party integrations (Supabase, RBAC).
- `src/lib/actions`: Server actions for handling business logic (e.g., risk radar, offboardings).
- `prisma/schema.prisma`: Database schema definition.

## User Preferences
- **Middleware**: Keep the middleware file named `middleware.ts` (not `proxy.ts`).
- **Performance**: High priority on reducing latency for the Risk Radar dashboard.
- **Reliability**: Middleware should avoid internal HTTP fetches to prevent timeout errors (`AbortError`).

## Project Guidelines
- **Database Access**: Prefer direct Supabase queries in middleware to avoid internal API bottlenecks.
- **Query Optimization**: Use database-level pagination (`skip`/`take`) and indexes for high-latency queries.
- **Schema Safety**: Always ensure required fields like `organizationId` are present in models and actions to prevent Prisma validation errors.

## Common Patterns
- **Parallel Fetching**: Use `Promise.all` in server actions for independent database queries to improve performance.
- **Fail-Closed Security**: Implement "fail-closed" logic in middleware for privileged routes (`/admin`, `/app`).
- **Strategic Indexing**: Maintain composite indexes on frequently filtered/sorted columns (e.g., `[organizationId, status, lastWorkingDay]`).
