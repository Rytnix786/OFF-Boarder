"use server";

import { prisma } from "@/lib/prisma.server";
import { requireActiveOrg } from "@/lib/auth.server";
import type { AuthSession } from "@/lib/auth-types";
import { requirePermission, requireOwnerOrAdmin } from "@/lib/rbac.server";
import { createAuditLog } from "@/lib/audit.server";
import { revalidatePath } from "next/cache";
import { DEFAULT_WORKFLOW_TEMPLATES, DEFAULT_WORKFLOW_TASKS, DefaultTask } from "@/lib/workflow-constants";

export async function createWorkflowTemplate(formData: FormData) {
  const session = await requireActiveOrg();
  requireOwnerOrAdmin(session);

  const orgId = session.currentOrgId!;
  const data = {
    name: formData.get("name") as string,
    description: formData.get("description") as string || null,
    isDefault: formData.get("isDefault") === "true",
  };

  if (!data.name) {
    return { error: "Template name is required" };
  }

  const existing = await prisma.workflowTemplate.findFirst({
    where: { organizationId: orgId, name: data.name },
  });

  if (existing) {
    return { error: "A template with this name already exists" };
  }

  if (data.isDefault) {
    await prisma.workflowTemplate.updateMany({
      where: { organizationId: orgId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const template = await prisma.workflowTemplate.create({
    data: {
      name: data.name,
      description: data.description,
      isDefault: data.isDefault,
      organizationId: orgId,
      config: {},
      tasks: {
        create: DEFAULT_WORKFLOW_TASKS.map((task) => ({
          name: task.name,
          description: task.description,
          category: task.category,
          order: task.order,
          defaultDueDays: task.defaultDueDays,
          requiresApproval: task.requiresApproval || false,
          isHighRiskTask: task.isHighRiskTask || false,
          isRequired: task.isRequired ?? true,
          assigneeRole: task.assigneeRole || null,
          assigneeDepartment: task.assigneeDepartment || null,
        })),
      },
    },
    include: { tasks: true },
  });

  await createAuditLog(session, orgId, {
    action: "workflow.created" as any,
    entityType: "WorkflowTemplate",
    entityId: template.id,
    newData: { name: data.name, taskCount: template.tasks.length },
  });

  revalidatePath("/app/workflows");
  return { success: true, template };
}

export async function updateWorkflowTemplate(templateId: string, formData: FormData) {
  const session = await requireActiveOrg();
  requireOwnerOrAdmin(session);

  const orgId = session.currentOrgId!;

  const template = await prisma.workflowTemplate.findFirst({
    where: { id: templateId, organizationId: orgId },
  });

  if (!template) {
    return { error: "Template not found" };
  }

  const data = {
    name: formData.get("name") as string || template.name,
    description: formData.get("description") as string || template.description,
    isDefault: formData.get("isDefault") === "true",
    isActive: formData.get("isActive") !== "false",
  };

  if (data.isDefault && !template.isDefault) {
    await prisma.workflowTemplate.updateMany({
      where: { organizationId: orgId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const newVersion = template.version + 1;

  const updated = await prisma.workflowTemplate.update({
    where: { id: templateId },
    data: {
      ...data,
      version: newVersion,
    },
  });

  await createAuditLog(session, orgId, {
    action: "workflow.updated" as any,
    entityType: "WorkflowTemplate",
    entityId: templateId,
    oldData: { name: template.name, isDefault: template.isDefault, version: template.version },
    newData: { name: data.name, isDefault: data.isDefault, version: newVersion },
  });

  revalidatePath("/app/workflows");
  revalidatePath(`/app/workflows/${templateId}`);
  return { success: true, template: updated };
}

export async function duplicateWorkflowTemplate(templateId: string, newName: string) {
  const session = await requireActiveOrg();
  requireOwnerOrAdmin(session);

  const orgId = session.currentOrgId!;

  const template = await prisma.workflowTemplate.findFirst({
    where: { id: templateId, organizationId: orgId },
    include: { tasks: true },
  });

  if (!template) {
    return { error: "Template not found" };
  }

  const existing = await prisma.workflowTemplate.findFirst({
    where: { organizationId: orgId, name: newName },
  });

  if (existing) {
    return { error: "A template with this name already exists" };
  }

  const newTemplate = await prisma.workflowTemplate.create({
    data: {
      name: newName,
      description: template.description,
      isDefault: false,
      organizationId: orgId,
      config: template.config as object,
      tasks: {
        create: template.tasks.map((task) => ({
          name: task.name,
          description: task.description,
          category: task.category,
          order: task.order,
          defaultDueDays: task.defaultDueDays,
          requiresApproval: task.requiresApproval,
          isHighRiskTask: task.isHighRiskTask,
          isRequired: task.isRequired,
          assigneeRole: task.assigneeRole,
          assigneeDepartment: task.assigneeDepartment,
        })),
      },
    },
    include: { tasks: true },
  });

  await createAuditLog(session, orgId, {
    action: "workflow.created" as any,
    entityType: "WorkflowTemplate",
    entityId: newTemplate.id,
    newData: { name: newName, duplicatedFrom: template.name, taskCount: newTemplate.tasks.length },
  });

  revalidatePath("/app/workflows");
  return { success: true, template: newTemplate };
}

export async function deleteWorkflowTemplate(templateId: string) {
  const session = await requireActiveOrg();
  requireOwnerOrAdmin(session);

  const orgId = session.currentOrgId!;

  const template = await prisma.workflowTemplate.findFirst({
    where: { id: templateId, organizationId: orgId },
    include: { _count: { select: { offboardings: true } } },
  });

  if (!template) {
    return { error: "Template not found" };
  }

  if (template._count.offboardings > 0) {
    return { error: "Cannot delete template that has been used in offboardings. Archive it instead." };
  }

  await prisma.workflowTemplate.delete({
    where: { id: templateId },
  });

  await createAuditLog(session, orgId, {
    action: "workflow.deleted" as any,
    entityType: "WorkflowTemplate",
    entityId: templateId,
    oldData: { name: template.name },
  });

  revalidatePath("/app/workflows");
  return { success: true };
}

export async function addTemplateTask(templateId: string, formData: FormData) {
  const session = await requireActiveOrg();
  requireOwnerOrAdmin(session);

  const orgId = session.currentOrgId!;

  const template = await prisma.workflowTemplate.findFirst({
    where: { id: templateId, organizationId: orgId },
    include: { tasks: { orderBy: { order: "desc" }, take: 1 } },
  });

  if (!template) {
    return { error: "Template not found" };
  }

  const maxOrder = template.tasks[0]?.order || 0;

  const task = await prisma.workflowTemplateTask.create({
    data: {
      workflowTemplateId: templateId,
      name: formData.get("name") as string,
      description: formData.get("description") as string || null,
      category: formData.get("category") as string || null,
      order: maxOrder + 1,
      defaultDueDays: formData.get("defaultDueDays") ? parseInt(formData.get("defaultDueDays") as string) : null,
      requiresApproval: formData.get("requiresApproval") === "true",
      isHighRiskTask: formData.get("isHighRiskTask") === "true",
      isRequired: formData.get("isRequired") !== "false",
      assigneeRole: formData.get("assigneeRole") as string || null,
      assigneeDepartment: formData.get("assigneeDepartment") as string || null,
      evidenceRequirement: (formData.get("evidenceRequirement") as "REQUIRED" | "OPTIONAL" | "NONE") || "NONE",
    },
  });

  await prisma.workflowTemplate.update({
    where: { id: templateId },
    data: { version: { increment: 1 } },
  });

  await createAuditLog(session, orgId, {
    action: "workflow.updated" as any,
    entityType: "WorkflowTemplate",
    entityId: templateId,
    newData: { taskAdded: task.name },
  });

  revalidatePath(`/app/workflows/${templateId}`);
  return { success: true, task };
}

export async function updateTemplateTask(taskId: string, formData: FormData) {
  const session = await requireActiveOrg();
  requireOwnerOrAdmin(session);

  const orgId = session.currentOrgId!;

  const task = await prisma.workflowTemplateTask.findUnique({
    where: { id: taskId },
    include: { workflowTemplate: true },
  });

  if (!task || task.workflowTemplate.organizationId !== orgId) {
    return { error: "Task not found" };
  }

  const updated = await prisma.workflowTemplateTask.update({
    where: { id: taskId },
    data: {
      name: formData.get("name") as string || task.name,
      description: formData.get("description") as string || task.description,
      category: formData.get("category") as string || task.category,
      defaultDueDays: formData.get("defaultDueDays") ? parseInt(formData.get("defaultDueDays") as string) : task.defaultDueDays,
      requiresApproval: formData.has("requiresApproval") ? formData.get("requiresApproval") === "true" : task.requiresApproval,
      isHighRiskTask: formData.has("isHighRiskTask") ? formData.get("isHighRiskTask") === "true" : task.isHighRiskTask,
      isRequired: formData.has("isRequired") ? formData.get("isRequired") === "true" : task.isRequired,
      assigneeRole: formData.get("assigneeRole") as string || task.assigneeRole,
      assigneeDepartment: formData.get("assigneeDepartment") as string || task.assigneeDepartment,
      evidenceRequirement: (formData.get("evidenceRequirement") as "REQUIRED" | "OPTIONAL" | "NONE") || task.evidenceRequirement,
    },
  });

  await prisma.workflowTemplate.update({
    where: { id: task.workflowTemplateId },
    data: { version: { increment: 1 } },
  });

  await createAuditLog(session, orgId, {
    action: "workflow.updated" as any,
    entityType: "WorkflowTemplate",
    entityId: task.workflowTemplateId,
    newData: { taskUpdated: updated.name },
  });

  revalidatePath(`/app/workflows/${task.workflowTemplateId}`);
  return { success: true, task: updated };
}

export async function deleteTemplateTask(taskId: string) {
  const session = await requireActiveOrg();
  requireOwnerOrAdmin(session);

  const orgId = session.currentOrgId!;

  const task = await prisma.workflowTemplateTask.findUnique({
    where: { id: taskId },
    include: { workflowTemplate: true },
  });

  if (!task || task.workflowTemplate.organizationId !== orgId) {
    return { error: "Task not found" };
  }

  await prisma.workflowTemplateTask.delete({
    where: { id: taskId },
  });

  await prisma.workflowTemplate.update({
    where: { id: task.workflowTemplateId },
    data: { version: { increment: 1 } },
  });

  await createAuditLog(session, orgId, {
    action: "workflow.updated" as any,
    entityType: "WorkflowTemplate",
    entityId: task.workflowTemplateId,
    oldData: { taskRemoved: task.name },
  });

  revalidatePath(`/app/workflows/${task.workflowTemplateId}`);
  return { success: true };
}

export async function reorderTemplateTasks(templateId: string, taskIds: string[]) {
  const session = await requireActiveOrg();
  requireOwnerOrAdmin(session);

  const orgId = session.currentOrgId!;

  const template = await prisma.workflowTemplate.findFirst({
    where: { id: templateId, organizationId: orgId },
  });

  if (!template) {
    return { error: "Template not found" };
  }

  await Promise.all(
    taskIds.map((taskId, index) =>
      prisma.workflowTemplateTask.update({
        where: { id: taskId },
        data: { order: index },
      })
    )
  );

  await prisma.workflowTemplate.update({
    where: { id: templateId },
    data: { version: { increment: 1 } },
  });

  revalidatePath(`/app/workflows/${templateId}`);
  return { success: true };
}

export async function getWorkflowTemplates() {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const orgId = session.currentOrgId!;

  return prisma.workflowTemplate.findMany({
    where: { organizationId: orgId },
    include: {
      tasks: { orderBy: { order: "asc" } },
      _count: { select: { offboardings: true } },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getWorkflowTemplate(templateId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const orgId = session.currentOrgId!;

  return prisma.workflowTemplate.findFirst({
    where: { id: templateId, organizationId: orgId },
    include: {
      tasks: { orderBy: { order: "asc" } },
      _count: { select: { offboardings: true } },
    },
  });
}

export async function getDefaultWorkflowTemplate(orgId: string) {
  return prisma.workflowTemplate.findFirst({
    where: { organizationId: orgId, isDefault: true, isActive: true },
    include: { tasks: { orderBy: { order: "asc" } } },
  });
}

async function createTemplateFromDefinition(
  orgId: string,
  templateDef: typeof DEFAULT_WORKFLOW_TEMPLATES[number],
  session?: AuthSession | null
) {
  const template = await prisma.workflowTemplate.create({
    data: {
      name: templateDef.name,
      description: templateDef.description,
      isDefault: templateDef.isDefault || false,
      organizationId: orgId,
      config: { riskLevel: templateDef.riskLevel },
      tasks: {
        create: templateDef.tasks.map((task) => ({
          name: task.name,
          description: task.description,
          category: task.category,
          order: task.order,
          defaultDueDays: task.defaultDueDays,
          requiresApproval: task.requiresApproval || false,
          isHighRiskTask: task.isHighRiskTask || false,
          isRequired: task.isRequired ?? true,
          assigneeRole: task.assigneeRole || null,
          assigneeDepartment: task.assigneeDepartment || null,
        })),
      },
    },
    include: { tasks: true },
  });

  if (session) {
    await createAuditLog(session, orgId, {
      action: "workflow.created" as any,
      entityType: "WorkflowTemplate",
      entityId: template.id,
      newData: { name: template.name, taskCount: template.tasks.length, isSystemDefault: true },
    });
  }

  return template;
}

export async function ensureDefaultWorkflowTemplates(orgId: string, session?: AuthSession | null) {
  const existingTemplates = await prisma.workflowTemplate.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true },
  });

  if (existingTemplates.length > 0) {
    return existingTemplates;
  }

  const createdTemplates = [];
  for (const templateDef of DEFAULT_WORKFLOW_TEMPLATES) {
    const template = await createTemplateFromDefinition(orgId, templateDef, session);
    createdTemplates.push(template);
  }

  return createdTemplates;
}

export async function resetDefaultWorkflowTemplates() {
  const session = await requireActiveOrg();
  requireOwnerOrAdmin(session);

  const orgId = session.currentOrgId!;

  const existingDefaultNames = DEFAULT_WORKFLOW_TEMPLATES.map(t => t.name);
  
  const existingDefaults = await prisma.workflowTemplate.findMany({
    where: { 
      organizationId: orgId,
      name: { in: existingDefaultNames },
    },
    include: { _count: { select: { offboardings: true } } },
  });

  const inUseTemplates = existingDefaults.filter(t => t._count.offboardings > 0);
  if (inUseTemplates.length > 0) {
    return { 
      error: `Cannot reset templates that are in use: ${inUseTemplates.map(t => t.name).join(", ")}. Archive them first.` 
    };
  }

  const toDelete = existingDefaults.filter(t => t._count.offboardings === 0);
  for (const template of toDelete) {
    await prisma.workflowTemplate.delete({
      where: { id: template.id },
    });
  }

  const createdTemplates = [];
  for (const templateDef of DEFAULT_WORKFLOW_TEMPLATES) {
    const existing = await prisma.workflowTemplate.findFirst({
      where: { organizationId: orgId, name: templateDef.name },
    });
    
    if (!existing) {
      const template = await createTemplateFromDefinition(orgId, templateDef, session);
      createdTemplates.push(template);
    }
  }

  await createAuditLog(session, orgId, {
    action: "workflow.updated" as any,
    entityType: "WorkflowTemplate",
    entityId: orgId,
    newData: { action: "reset_defaults", templatesCreated: createdTemplates.length },
  });

  revalidatePath("/app/workflows");
  return { success: true, templatesCreated: createdTemplates.length };
}

export async function ensureDefaultWorkflowTemplate(orgId: string) {
  const existing = await prisma.workflowTemplate.findFirst({
    where: { organizationId: orgId, isDefault: true },
  });

  if (existing) {
    return existing;
  }

  return createTemplateFromDefinition(orgId, DEFAULT_WORKFLOW_TEMPLATES[0]);
}

export async function getWorkflowTemplateSnapshot(templateId: string) {
  const template = await prisma.workflowTemplate.findUnique({
    where: { id: templateId },
    include: { tasks: { orderBy: { order: "asc" } } },
  });

  if (!template) return null;

  return {
    id: template.id,
    name: template.name,
    version: template.version,
    snapshotAt: new Date().toISOString(),
    tasks: template.tasks.map(t => ({
      name: t.name,
      description: t.description,
      category: t.category,
      defaultDueDays: t.defaultDueDays,
      requiresApproval: t.requiresApproval,
      isHighRiskTask: t.isHighRiskTask,
      isRequired: t.isRequired,
      assigneeRole: t.assigneeRole,
      assigneeDepartment: t.assigneeDepartment,
      order: t.order,
    })),
  };
}
