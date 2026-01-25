import type { SystemRole, OrgStatus, MembershipStatus } from "@prisma/client";

export type AuthUser = {
  id: string;
  supabaseId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isPlatformAdmin: boolean;
  createdAt: Date;
};

export type MembershipWithOrg = {
  id: string;
  organizationId: string;
  systemRole: SystemRole;
  status: MembershipStatus;
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    status: OrgStatus;
    isSetupComplete: boolean;
  };
};

export type AuthSession = {
  user: AuthUser;
  memberships: MembershipWithOrg[];
  currentMembership: MembershipWithOrg | null;
  currentOrgId: string | null;
  employeeLink?: {
    status: string;
    organizationId: string;
  } | null;
};
