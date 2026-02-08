# OffboardHQ Role Model - Validation Test Documentation

## Overview

This document provides manual test steps to validate the corrected role model implementation with strict server-side enforcement.

---

## A) Role Definitions

### Org Roles (Primary RBAC)
| Role | Description |
|------|-------------|
| **OWNER** | Full org control, can approve admin join requests |
| **ADMIN** | Configure workflows, policies, offboardings, assign tasks, approve member requests |
| **CONTRIBUTOR** | See only assigned tasks/cases, complete tasks, attach evidence |
| **AUDITOR** | Read-only access to audit logs, evidence packs, reports |

### Portal Modes (Derived, not selectable as primary role)
| Mode | Description |
|------|-------------|
| **SUBJECT_PORTAL** | Person being offboarded - can only see their own offboarding tasks marked "Employee Required" |
| **CONTRIBUTOR_PORTAL** | Task executor without broader org access - sees only assigned tasks |

---

## B) Data Model Changes

### New/Updated Enums
- `SystemRole`: OWNER, ADMIN, CONTRIBUTOR, AUDITOR (renamed MEMBER to CONTRIBUTOR)
- `PortalType`: SUBJECT_PORTAL, CONTRIBUTOR_PORTAL
- `JoinRequestRole`: CONTRIBUTOR, ADMIN

### Updated Models
- `EmployeeUserLink`: Added `portalType` field
- `EmployeePortalInvite`: Added `portalType` field
- `OffboardingTask`: Added `isEmployeeRequired`, `assignedToUserId` fields

---

## C) Validation Test Scenarios

### Test 1: Owner/Admin Can Manage Organization
**Steps:**
1. Login as OWNER or ADMIN
2. Navigate to Settings > Organization
3. Verify can view and edit organization settings
4. Navigate to Settings > Members
5. Verify can invite, update, and remove members
6. Navigate to Offboardings
7. Verify can create new offboarding

**Expected:** All operations succeed

**API Test:**
```bash
# As admin user, create offboarding
curl -X POST /api/offboardings -d '{"employeeId": "...", "reason": "Resignation"}'
# Expected: 200 OK
```

---

### Test 2: Contributor Cannot Access Org Settings
**Steps:**
1. Login as CONTRIBUTOR role user
2. Attempt to navigate to /app/settings/members
3. Attempt to navigate to /app/settings/organization
4. Attempt to navigate to /app/employees

**Expected:** Redirected to /app/access-denied for all restricted routes

**API Test:**
```bash
# As contributor, try to access members API
curl /api/roles
# Expected: 403 Forbidden or redirect to access-denied
```

---

### Test 3: Auditor Is Read-Only
**Steps:**
1. Login as AUDITOR role user
2. Navigate to Audit Logs - should work
3. Navigate to Reports - should work
4. Attempt to create an offboarding
5. Attempt to approve an approval request
6. Attempt to complete a task

**Expected:** 
- Read operations succeed
- All write operations blocked with "Auditors cannot perform this action"

**API Test:**
```bash
# As auditor, try to update offboarding
curl -X PATCH /api/offboardings/[id] -d '{"status": "IN_PROGRESS"}'
# Expected: Error "INVARIANT: Auditors cannot perform action: update_offboarding"
```

---

### Test 4: Subject Cannot Self-Execute Own Offboarding
**Setup:**
1. Create Employee record "John Doe"
2. Invite John to Subject Portal (creates UserEmployeeLink)
3. John accepts invite and logs in
4. Start offboarding for John

**Steps:**
1. As John (Subject), navigate to /app/offboardings
2. Verify John's own offboarding case is NOT visible in the list
3. As John, try to access /app/offboardings/[john's-case-id] directly

**Expected:**
- John cannot see his case in offboarding list
- Direct access returns null/forbidden

**API Test:**
```bash
# As John (subject), try to update own offboarding
curl -X PATCH /api/offboardings/[johns-offboarding-id] -d '{"notes": "test"}'
# Expected: Error "INVARIANT: Subjects cannot act as helpers, approvers, or operators on their own offboarding"
```

---

### Test 5: Subject Cannot Approve Own Offboarding
**Setup:** Same as Test 4

**Steps:**
1. As Admin, create approval request for John's offboarding
2. Switch to John's account
3. Attempt to submit approval (via API or if UI exposes it)

**Expected:** Error "INVARIANT: Subjects cannot approve or reject their own offboarding"

**API Test:**
```bash
# As John (subject), try to approve own case
curl -X POST /api/approvals/[approval-id]/submit -d '{"status": "APPROVED"}'
# Expected: Error with INVARIANT violation
```

---

### Test 6: Subject CAN Complete Employee-Required Tasks
**Setup:**
1. Create offboarding with task marked `isEmployeeRequired: true`
2. John is the offboarding subject

**Steps:**
1. Login as John (Subject Portal)
2. Navigate to Employee Portal /app/employee
3. Find the employee-required task
4. Complete the task

**Expected:** Task completion succeeds

**API Test:**
```bash
# As John (subject), complete employee-required task
curl -X PATCH /api/tasks/[employee-task-id] -d '{"status": "COMPLETED"}'
# Expected: 200 OK (task.isEmployeeRequired = true)
```

---

### Test 7: Subject CANNOT Complete Non-Employee Tasks
**Setup:**
1. Create offboarding for John with regular task (isEmployeeRequired: false)

**Steps:**
1. Login as John
2. Attempt to complete a regular task in his case

**Expected:** Error "INVARIANT: Subjects can only complete tasks marked as 'Employee Required'"

---

### Test 8: Contributor Can Only Complete Assigned Tasks
**Setup:**
1. Create Contributor user "Bob"
2. Create offboarding with task assigned to Bob (assignedToUserId = Bob's ID)
3. Create another task NOT assigned to Bob

**Steps:**
1. Login as Bob (Contributor)
2. Complete the task assigned to Bob
3. Attempt to complete the task NOT assigned to Bob

**Expected:**
- Assigned task: Success
- Unassigned task: Error "INVARIANT: Contributors can only complete tasks assigned to them"

---

### Test 9: Portal Invite with Type Selection
**Steps:**
1. Login as Admin
2. Go to Employee record
3. Click "Invite to Portal"
4. Select portal type: SUBJECT_PORTAL or CONTRIBUTOR_PORTAL
5. Send invite
6. Verify invite created with correct portalType

**Expected:** 
- Invite email contains correct portal type
- On acceptance, EmployeeUserLink created with matching portalType

---

### Test 10: Invariant Violations Logged to Audit
**Steps:**
1. Trigger any invariant violation (e.g., subject trying to approve own case)
2. Check AuditLog table

**Expected:** AuditLog entry with:
- action: "invariant_violation_blocked"
- entityType: "invariant"
- entityId: [invariant name, e.g., "SUBJECT_CANNOT_SELF_APPROVE"]
- metadata: includes reason and relevant IDs

**SQL Verification:**
```sql
SELECT * FROM "AuditLog" 
WHERE action = 'invariant_violation_blocked' 
ORDER BY "createdAt" DESC;
```

---

## D) Permission Matrix Summary

| Action | OWNER | ADMIN | CONTRIBUTOR | AUDITOR | SUBJECT_PORTAL |
|--------|-------|-------|-------------|---------|----------------|
| Create Offboarding | Y | Y | N | N | N |
| Update Offboarding | Y | Y | N | N | N |
| Cancel Offboarding | Y | Y | N | N | N |
| Complete Any Task | Y | Y | Assigned Only | N | Employee-Required Only |
| Approve Requests | Y | Y | N | N | Never Own Case |
| View Audit Logs | Y | Y | N | Y | N |
| Export Reports | Y | Y | N | Y | N |
| Manage Members | Y | Y | N | N | N |
| View Own Tasks | Y | Y | Y | Y | Y |
| Manage Workflows | Y | Y | N | N | N |
| Access Risk Radar | Y | Y | N | Y | N |

---

## E) Non-Negotiable Invariants (Server-Enforced)

1. **SUBJECT_CANNOT_SELF_EXECUTE**: Subject may NEVER be assigned as executor for tasks in their own offboarding
2. **SUBJECT_CANNOT_SELF_APPROVE**: Subject may NEVER approve anything in their own case
3. **CONTRIBUTOR_TASKS_ONLY**: Contributor cannot initiate offboarding, edit workflows, or manage members
4. **AUDITOR_READ_ONLY**: Auditor cannot complete tasks or trigger actions

All violations are:
- Blocked with HTTP 400/403
- Logged to AuditLog with `invariant_violation_blocked` action

---

## F) Files Modified

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | SystemRole enum (CONTRIBUTOR), PortalType enum, model updates |
| `src/lib/permissions.ts` | CONTRIBUTOR permissions, role helpers |
| `src/lib/rbac.ts` | Invariant enforcement, portal mode detection |
| `src/lib/require-permission.ts` | CONTRIBUTOR guards |
| `src/lib/actions/offboardings.ts` | Invariant checks on all mutations |
| `src/lib/actions/approvals.ts` | Self-approval prevention |
| `src/lib/actions/employee-invite.ts` | Portal type support |

---

## G) Employee Portal User - Derived Access Mode Tests

### Test 11: Employee Without Portal Invite Has No Portal Access
**Setup:**
1. Create Employee record "Alice" without sending portal invite
2. Alice creates a user account with matching email

**Steps:**
1. Login as Alice
2. Navigate to /app/portal

**Expected:**
- Portal page shows "Portal Access Required" message
- Message: "No verified employee link exists. Portal access requires an accepted portal invitation."

---

### Test 12: Portal Invite Flow - Subject Portal
**Steps:**
1. Login as Admin
2. Go to Employees > Select employee "Bob"
3. Click "Invite to Portal" button
4. Select "Subject Portal" type
5. Click "Send Invitation"

**Expected:**
- EmployeePortalInvite record created with portalType = "SUBJECT_PORTAL"
- Audit log entry: "employee_portal_invite_sent"

**Acceptance:**
1. Open invite link as Bob
2. Sign in with Bob's email
3. Accept invitation

**Expected:**
- EmployeeUserLink created with portalType = "SUBJECT_PORTAL"
- Redirects to /app/portal

---

### Test 13: Portal Invite Flow - Contributor Portal
**Steps:**
1. Login as Admin
2. Go to Employees > Select employee "Carol"
3. Click "Invite to Portal" button
4. Select "Contributor Portal" type
5. Click "Send Invitation"

**Expected:**
- EmployeePortalInvite record created with portalType = "CONTRIBUTOR_PORTAL"

**After Acceptance:**
- Carol can only see assigned tasks in /app/portal
- Carol cannot see org dashboards or settings

---

### Test 14: Derived Portal Mode - Subject with Active Offboarding
**Setup:**
1. Employee "Dave" has accepted Subject Portal invite
2. Admin starts offboarding for Dave

**Steps:**
1. Login as Dave
2. Navigate to /app/portal

**Expected:**
- Portal shows "My Offboarding Portal" heading
- Shows only tasks marked `isEmployeeRequired: true`
- Shows offboarding status and target date
- Does NOT show org navigation

---

### Test 15: Derived Portal Mode - Contributor with Assigned Tasks
**Setup:**
1. Employee "Eve" has accepted Contributor Portal invite
2. Admin assigns tasks to Eve (assignedToUserId = Eve's userId)

**Steps:**
1. Login as Eve
2. Navigate to /app/portal

**Expected:**
- Portal shows "My Assigned Tasks" heading
- Shows tasks across multiple offboarding cases where Eve is assigned
- Shows subject name (minimal context)
- Does NOT show their own offboarding cases (if any)

---

### Test 16: Subject Override Rule - Admin Who Is Subject
**Setup:**
1. User "Frank" is ADMIN with portal access
2. Admin starts offboarding for Frank

**Steps:**
1. Login as Frank
2. Navigate to /app/offboardings

**Expected:**
- Frank's own offboarding case NOT visible in list
- Frank can still manage OTHER offboarding cases (Admin privileges intact)

**Direct Access Test:**
1. Frank tries to access /app/offboardings/[franks-case-id] directly

**Expected:**
- Redirected to /app/access-denied
- Reason: "You cannot view your own offboarding case"

---

### Test 17: Subject Never in Helper Lists
**Setup:**
1. Employee "Grace" is being offboarded
2. Grace has portal access

**Verification:**
1. Login as Admin
2. Go to Grace's offboarding case
3. Try to assign a task to Grace

**Expected:**
- Grace should NOT appear in assignee dropdown
- API should reject if somehow attempted

---

### Test 18: Portal Access Without Membership
**Setup:**
1. Employee "Henry" has portal access via EmployeeUserLink
2. Henry is NOT a member of the organization (no Membership record)

**Steps:**
1. Login as Henry
2. Access /app/portal

**Expected:**
- Henry can access portal if they have valid EmployeeUserLink
- Portal shows appropriate tasks based on portalType

**Note:** Portal access is derived from EmployeeUserLink, NOT from Membership table.

---

## H) Portal Context Computation Logic

### How Portal Mode is Derived

```typescript
async function computePortalContext(session):
  1. Check for EmployeeUserLink(userId, orgId, status: VERIFIED)
  2. If no link → portalMode = NONE
  3. Get linked employeeId
  4. Check for active offboarding where employee is subject
  5. If active offboarding exists → portalMode = SUBJECT_PORTAL
  6. Else if portalType = CONTRIBUTOR_PORTAL OR has assigned tasks → portalMode = CONTRIBUTOR_PORTAL
  7. Else → portalMode = NONE
```

### Subject Override Rule Logic

```typescript
async function enforceSubjectOverrideRule(session, offboardingId, action):
  1. Check if user is subject of this specific offboarding
  2. If subject AND action in [execute, approve, view_admin_metadata]:
     - Log to audit: subject_override_blocked
     - Throw InvariantViolationError
  3. Original role preserved for OTHER cases
```

---

## I) Key Files for Employee Portal

| File | Purpose |
|------|---------|
| `src/lib/portal-context.ts` | Derived portal mode computation |
| `src/app/app/portal/page.tsx` | Portal surface for subjects/contributors |
| `src/app/app/portal/portal-task-list.tsx` | Task list component |
| `src/lib/actions/portal-tasks.ts` | Server actions for portal task completion |
| `src/lib/actions/employee-invite.ts` | Portal invite CRUD |
| `src/app/employee-invite/[token]/page.tsx` | Invite acceptance page |

