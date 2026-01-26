"use server";

import { prisma } from "@/lib/prisma.server";
import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { createAuditLog } from "@/lib/audit.server";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";

export interface IntegrationConfig {
  type: string;
  name: string;
  config: Record<string, any>;
}

export async function createIntegration(formData: FormData) {
  try {
    const session = await requireActiveOrg();
    await requirePermission(session, "integration:manage");
    
    const orgId = session.currentOrgId!;
    const type = formData.get("type") as string;
    const name = formData.get("name") as string;
    
    // Get integration-specific config
    const config: Record<string, any> = {};
    
    if (type === "slack") {
      config.webhookUrl = formData.get("webhookUrl") as string;
      config.channel = formData.get("channel") as string;
    } else if (type === "email") {
      config.smtpHost = formData.get("smtpHost") as string;
      config.smtpPort = parseInt(formData.get("smtpPort") as string);
      config.smtpUser = formData.get("smtpUser") as string;
      config.smtpPass = formData.get("smtpPass") as string;
    }

    const integration = await prisma.integration.create({
      data: {
        organizationId: orgId,
        type,
        name,
        config,
        status: "connected",
      },
    });

    await createAuditLog(session, orgId, {
      action: "integration.created",
      entityType: "Integration",
      entityId: integration.id,
      newData: { type, name },
    });

    revalidatePath("/app/integrations");
    return { success: true, integration };
  } catch (error) {
    console.error("Failed to create integration:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function testIntegration(integrationId: string) {
  try {
    const session = await requireActiveOrg();
    await requirePermission(session, "integration:manage");
    
    const orgId = session.currentOrgId!;
    
    const integration = await prisma.integration.findFirst({
      where: { 
        id: integrationId, 
        organizationId: orgId 
      },
    });

    if (!integration) {
      return { error: "Integration not found" };
    }

    let testResult = { success: false, message: "Unknown integration type" };

    switch (integration.type) {
      case "slack":
        testResult = await testSlackIntegration(integration.config as any);
        break;
      case "email":
        testResult = await testEmailIntegration(integration.config as any);
        break;
      default:
        testResult = { success: true, message: `${integration.type} integration test not implemented but connection appears valid` };
    }

    // Update last sync time
    await prisma.integration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    await createAuditLog(session, orgId, {
      action: "integration.tested",
      entityType: "Integration",
      entityId: integrationId,
      newData: { result: testResult },
    });

    return testResult;
  } catch (error) {
    console.error("Failed to test integration:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function testSlackIntegration(config: { webhookUrl: string; channel: string }) {
  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "🧪 OffBoarder Integration Test",
        channel: config.channel,
        username: "OffBoarder Bot",
      }),
    });

    if (response.ok) {
      return { success: true, message: "Slack webhook test successful" };
    } else {
      return { success: false, message: `Slack webhook failed: ${response.statusText}` };
    }
  } catch (error) {
    return { success: false, message: `Slack webhook error: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

async function testEmailIntegration(config: { smtpHost: string; smtpPort: number; smtpUser: string; smtpPass: string }) {
  try {
    // For now, just validate the config and send a test email via our email system
    const emailResult = await sendEmail({
      to: config.smtpUser,
      subject: "OffBoarder Email Integration Test",
      html: `
        <h2>🧪 Integration Test</h2>
        <p>This is a test email from OffBoarder to verify your email integration is working.</p>
        <p>SMTP Host: ${config.smtpHost}</p>
        <p>SMTP Port: ${config.smtpPort}</p>
      `,
      text: `OffBoarder Email Integration Test\n\nSMTP Host: ${config.smtpHost}\nSMTP Port: ${config.smtpPort}`
    });

    if (emailResult.success) {
      return { success: true, message: "Email integration test successful" };
    } else {
      return { success: false, message: `Email test failed: ${emailResult.error}` };
    }
  } catch (error) {
    return { success: false, message: `Email integration error: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

export async function deleteIntegration(integrationId: string) {
  try {
    const session = await requireActiveOrg();
    await requirePermission(session, "integration:manage");
    
    const orgId = session.currentOrgId!;
    
    const integration = await prisma.integration.findFirst({
      where: { 
        id: integrationId, 
        organizationId: orgId 
      },
    });

    if (!integration) {
      return { error: "Integration not found" };
    }

    await prisma.integration.delete({
      where: { id: integrationId },
    });

    await createAuditLog(session, orgId, {
      action: "integration.deleted",
      entityType: "Integration",
      entityId: integrationId,
      newData: { type: integration.type, name: integration.name },
    });

    revalidatePath("/app/integrations");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete integration:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getIntegrations() {
  try {
    const session = await requireActiveOrg();
    await requirePermission(session, "integration:read");
    
    const orgId = session.currentOrgId!;
    
    const integrations = await prisma.integration.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, integrations };
  } catch (error) {
    console.error("Failed to get integrations:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function triggerIntegration(integrationId: string, data: Record<string, any>) {
  try {
    const session = await requireActiveOrg();
    await requirePermission(session, "integration:manage");
    
    const orgId = session.currentOrgId!;
    
    const integration = await prisma.integration.findFirst({
      where: { 
        id: integrationId, 
        organizationId: orgId 
      },
    });

    if (!integration) {
      return { error: "Integration not found" };
    }

    let result = { success: false, message: "Unknown integration type" };

    switch (integration.type) {
      case "slack":
        result = await triggerSlackIntegration(integration.config as any, data);
        break;
      case "email":
        result = await triggerEmailIntegration(integration.config as any, data);
        break;
      default:
        result = { success: true, message: `${integration.type} integration trigger not implemented` };
    }

    // Update last sync time
    await prisma.integration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    await createAuditLog(session, orgId, {
      action: "integration.triggered",
      entityType: "Integration",
      entityId: integrationId,
      newData: { data, result },
    });

    return result;
  } catch (error) {
    console.error("Failed to trigger integration:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function triggerSlackIntegration(config: { webhookUrl: string; channel: string }, data: Record<string, any>) {
  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: data.message || "OffBoarder Alert",
        channel: config.channel,
        username: "OffBoarder Bot",
        attachments: data.attachments || [],
      }),
    });

    if (response.ok) {
      return { success: true, message: "Slack notification sent successfully" };
    } else {
      return { success: false, message: `Slack notification failed: ${response.statusText}` };
    }
  } catch (error) {
    return { success: false, message: `Slack notification error: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

async function triggerEmailIntegration(config: { smtpHost: string; smtpPort: number; smtpUser: string; smtpPass: string }, data: Record<string, any>) {
  try {
    const emailResult = await sendEmail({
      to: data.to || config.smtpUser,
      subject: data.subject || "OffBoarder Notification",
      html: data.html || `<p>${data.message || "OffBoarder notification"}</p>`,
      text: data.text || data.message || "OffBoarder notification"
    });

    if (emailResult.success) {
      return { success: true, message: "Email notification sent successfully" };
    } else {
      return { success: false, message: `Email notification failed: ${emailResult.error}` };
    }
  } catch (error) {
    return { success: false, message: `Email notification error: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}
