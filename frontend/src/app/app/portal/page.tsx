import { redirect } from "next/navigation";
import { requireActiveOrg } from "@/lib/auth.server";
import { computePortalContext } from "@/lib/portal-context.server";
import { 
  getEmployeeRequiredTasksForSubject, 
  getAssignedTasksForContributor 
} from "@/lib/portal-context.server";
import { canAccessPortal } from "@/lib/rbac.server";
import { prisma } from "@/lib/prisma.server";
import { PortalTaskList } from "./portal-task-list";

export default async function PortalPage() {
  const session = await requireActiveOrg();
  const userId = session.user.id;
  const orgId = session.currentOrgId!;

  const portalAccess = await canAccessPortal(userId, orgId);
  
  if (!portalAccess.canAccess) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-500 text-3xl">
              lock
            </span>
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">
            Portal Access Required
          </h1>
          <p className="text-[#888] mb-4">
            {portalAccess.reason}
          </p>
          <p className="text-sm text-[#666]">
            If you believe you should have access, please contact your HR administrator.
          </p>
        </div>
      </div>
    );
  }

  const portalContext = await computePortalContext(session);

  if (portalContext.portalMode === "NONE") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-500 text-3xl">
              check_circle
            </span>
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">
            No Active Tasks
          </h1>
          <p className="text-[#888]">
            You don&apos;t have any pending tasks or active offboarding processes at this time.
          </p>
        </div>
      </div>
    );
  }

  let employee = null;
  let offboarding = null;
  
  if (portalContext.linkedEmployeeId) {
    employee = await prisma.employee.findUnique({
      where: { id: portalContext.linkedEmployeeId },
      select: { firstName: true, lastName: true, email: true },
    });
  }

  if (portalContext.activeOffboardingId) {
    offboarding = await prisma.offboarding.findUnique({
      where: { id: portalContext.activeOffboardingId },
      select: { 
        id: true, 
        status: true,
        reason: true,
        createdAt: true,
      },
    });
  }

  const subjectTasks = portalContext.portalMode === "SUBJECT_PORTAL"
    ? await getEmployeeRequiredTasksForSubject(userId, orgId)
    : [];

  const contributorTasks = portalContext.portalMode === "CONTRIBUTOR_PORTAL"
    ? await getAssignedTasksForContributor(userId, orgId)
    : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="border-b border-[#262626] bg-[#141414]">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              portalContext.portalMode === "SUBJECT_PORTAL" 
                ? "bg-amber-500/10" 
                : "bg-blue-500/10"
            }`}>
              <span className={`material-symbols-outlined ${
                portalContext.portalMode === "SUBJECT_PORTAL"
                  ? "text-amber-500"
                  : "text-blue-500"
              }`}>
                {portalContext.portalMode === "SUBJECT_PORTAL" ? "person" : "task_alt"}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">
                {portalContext.portalMode === "SUBJECT_PORTAL" 
                  ? "My Offboarding Portal" 
                  : "My Assigned Tasks"}
              </h1>
              {employee && (
                <p className="text-sm text-[#888]">
                  {employee.firstName} {employee.lastName}
                </p>
              )}
            </div>
          </div>

          {portalContext.portalMode === "SUBJECT_PORTAL" && offboarding && (
            <div className="mt-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#262626]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#888]">Started On</p>
                  <p className="text-white font-medium">
                    {offboarding.createdAt 
                      ? new Date(offboarding.createdAt).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Not set"}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm ${
                  offboarding.status === "IN_PROGRESS" 
                    ? "bg-blue-500/10 text-blue-400"
                    : offboarding.status === "PENDING"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-[#262626] text-[#888]"
                }`}>
                  {offboarding.status.replace(/_/g, " ")}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {portalContext.portalMode === "SUBJECT_PORTAL" ? (
          <>
            <h2 className="text-lg font-medium text-white mb-4">
              Your Required Tasks
            </h2>
            <p className="text-sm text-[#888] mb-6">
              Please complete the following tasks as part of your offboarding process.
            </p>
            <PortalTaskList 
              tasks={subjectTasks} 
              mode="subject"
            />
          </>
        ) : (
          <>
            <h2 className="text-lg font-medium text-white mb-4">
              Tasks Assigned to You
            </h2>
            <p className="text-sm text-[#888] mb-6">
              Complete the following tasks assigned to you across offboarding cases.
            </p>
            <PortalTaskList 
              tasks={contributorTasks} 
              mode="contributor"
            />
          </>
        )}
      </div>
    </div>
  );
}
