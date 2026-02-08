# OffBoarder Navigation Performance Analysis Report

## Executive Summary

Page-to-page navigation is slow due to **cascading async operations** on every route, **redundant auth checks**, and **client-side query waterfalls**. The estimated impact is **300-800ms delay per navigation**.

---

## Top 3 Root Causes (Ranked by Impact)

### 1. CRITICAL: IP Block Check in Middleware (150-300ms per request)

**File:** `frontend/src/lib/supabase/middleware.ts` (Lines 17-39, 58-69)

**Problem:**
Every navigation to `/app/*`, `/login`, `/register`, or `/invite` triggers a synchronous HTTP fetch to `/api/blocked-ips/check` which queries the database.

```typescript
// Line 23-33 - Makes a fetch to API route on EVERY request
const response = await fetch(`${baseUrl}/api/blocked-ips/check`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ipAddress, path, method, userAgent }),
});
```

**Impact:** 
- Adds 150-300ms latency to every navigation
- Sequential blocking call before any page rendering begins
- Query in `ip-blocking.ts` line 92-99 runs `findFirst` on BlockedIP table

**Fix:**
```typescript
// Option 1: Cache IP check result in middleware using cookies (5-minute TTL)
const cachedResult = request.cookies.get("ip-check-result");
if (cachedResult && Date.now() - parseInt(cachedResult.value) < 300000) {
  // Skip check, use cached result
}

// Option 2: Move to edge-compatible in-memory cache with async revalidation
```

---

### 2. HIGH: Sequential Auth + Membership Queries in App Layout (100-200ms)

**File:** `frontend/src/app/app/layout.tsx` (Lines 14-71)

**Problem:**
Every `/app/*` navigation executes this waterfall:
1. `getAuthSession()` → Supabase auth + Prisma user query
2. `prisma.membership.findFirst()` → Blocked org check (lines 27-38)  
3. `getUserPendingOrgs()` → Another Prisma query (line 51)
4. `getUserPermissions()` → Custom role query (line 71)

```typescript
// Lines 14-16 - Sequential awaits
const session = await getAuthSession();  // ~80-150ms
// Lines 27-38 - Another query if no membership
const blockedMembership = await prisma.membership.findFirst({...}); // ~30-50ms
// Line 51
const pendingOrgs = await getUserPendingOrgs(session.user.id);  // ~30-50ms  
// Line 71
const userPermissions = await getUserPermissions(session);  // ~40-80ms
```

**Impact:**
- 4 sequential database queries per navigation
- Not cached between navigations
- `getAuthSession` in `auth.server.ts` lines 22-45 makes 2 queries itself

**Fix:**
```typescript
// Combine into single Prisma query with all needed relations
const userData = await prisma.user.findUnique({
  where: { supabaseId: supabaseUser.id },
  include: {
    memberships: {
      include: { 
        organization: true,
        roleAssignments: { include: { customRole: { include: { permissions: true } } } }
      },
    },
  },
});
// Also: Use React cache() or unstable_cache for session data
```

---

### 3. MEDIUM: Client-Side Notification Polling Triggers on Mount (50-100ms)

**File:** `frontend/src/components/app/AppShell.tsx` (Lines 129-145)

**Problem:**
AppShell component immediately fetches notifications on every mount:

```typescript
// Lines 129-145
useEffect(() => {
  const fetchNotifications = async () => {
    const res = await fetch("/api/notifications");  // Triggers full getAuthSession again
    // ...
  };
  fetchNotifications();  // Called immediately on mount
  const interval = setInterval(fetchNotifications, 30000);
}, []);
```

**Impact:**
- Triggers another `/api/notifications` request on every navigation
- API route in `notifications/route.ts` line 9 calls `getAuthSession()` again
- Cascades to 2 more database queries

**Fix:**
```typescript
// Use SWR or React Query with deduplication
const { data } = useSWR('/api/notifications', fetcher, { 
  dedupingInterval: 30000,
  revalidateOnFocus: false 
});

// Or: Pass notifications from server component via props
```

---

## Additional Issues Identified

### 4. RBAC Permission Query per Route

**File:** `frontend/src/lib/rbac.ts` (Lines 22-43)

```typescript
// getUserPermissions makes a query EVERY time
const customAssignments = await prisma.membershipRoleAssignment.findMany({
  where: { membershipId: session.currentMembership.id },
  include: { customRole: { include: { permissions: true } } },
});
```

**Impact:** ~40-80ms per navigation, not cached.

---

### 5. Offboardings Page Makes 3 Parallel Queries + 1 Sequential

**File:** `frontend/src/app/app/offboardings/page.tsx` (Lines 9-54)

```typescript
const excludedOffboardingIds = await getExcludedOffboardingIdsForUser(...);  // Sequential first!
const [offboardings, employees, workflowTemplates] = await Promise.all([...]);  // Then parallel
```

**Impact:** Sequential query before parallel, adds ~30-50ms.

---

## Timing Breakdown (Estimated)

| Operation | Location | Time (ms) |
|-----------|----------|-----------|
| Middleware IP check | middleware.ts:58-69 | 150-300 |
| Supabase getUser | auth.server.ts:10-19 | 50-100 |
| Prisma user+memberships | auth.server.ts:26-44 | 50-100 |
| Blocked membership check | layout.tsx:27-38 | 30-50 |
| RBAC permissions | rbac.ts:27-42 | 40-80 |
| Client notification fetch | AppShell.tsx:129-145 | 50-100 |
| **Total** | | **370-730ms** |

---

## Recommended Fixes (Smallest Changes, Highest Impact)

### Fix 1: Cache IP Check Result (HIGH IMPACT, LOW EFFORT)

```typescript
// middleware.ts - Add caching
const IP_CHECK_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ipCheckCookie = request.cookies.get("_ip_check");

if (ipCheckCookie) {
  const { timestamp, allowed } = JSON.parse(ipCheckCookie.value);
  if (Date.now() - timestamp < IP_CHECK_CACHE_TTL && allowed) {
    // Skip IP check
  }
}
```

### Fix 2: Combine Auth Queries (HIGH IMPACT, MEDIUM EFFORT)

```typescript
// auth.server.ts - Single query with all relations
export async function getFullAuthContext(supabaseId: string) {
  return prisma.user.findUnique({
    where: { supabaseId },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: {
          organization: true,
          roleAssignments: {
            include: { customRole: { include: { permissions: true } } }
          }
        }
      }
    }
  });
}
```

### Fix 3: Add React Cache to Session (MEDIUM IMPACT, LOW EFFORT)

```typescript
// auth.server.ts - Add React cache
import { cache } from "react";

export const getAuthSession = cache(async (orgSlug?: string): Promise<AuthSession | null> => {
  // existing implementation
});
```

### Fix 4: Deduplicate Client Notifications (LOW IMPACT, LOW EFFORT)

```typescript
// AppShell.tsx - Skip initial fetch, rely on server-passed data
// Or use SWR with dedupingInterval: 60000
```

---

## How to Reproduce & Measure

1. Open browser DevTools → Network tab
2. Navigate between `/app/offboardings` and `/app/employees`
3. Observe:
   - `/api/blocked-ips/check` call on every navigation
   - `/api/notifications` call on every navigation
   - Server response times in Network timing

4. Add to any page component to log server timing:
```typescript
import { createTiming } from "@/lib/perf-instrumentation";
const timing = createTiming();
// ... wrap each await with timing.measure()
timing.log("/app/offboardings");
```

---

## Summary Table

| Issue | File:Line | Est. Savings | Effort |
|-------|-----------|--------------|--------|
| Cache IP check | middleware.ts:58-69 | 150-300ms | Low |
| Combine auth queries | auth.server.ts + layout.tsx | 80-150ms | Medium |
| Add React cache() | auth.server.ts:22 | 50-100ms | Low |
| Dedupe notifications | AppShell.tsx:129-145 | 50-100ms | Low |

**Total Potential Savings: 330-650ms per navigation**
