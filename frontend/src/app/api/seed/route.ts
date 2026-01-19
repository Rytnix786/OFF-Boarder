import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requireAuth } from "@/lib/auth.server";
import { isAdmin } from "@/lib/rbac.server";
import { EmployeeStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    if (!isAdmin(session)) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const orgId = session.currentOrgId!;
    const now = new Date();

    const existingDepts = await prisma.department.findMany({
      where: { organizationId: orgId },
    });

    let department1, department2, department3;
    if (existingDepts.length === 0) {
      department1 = await prisma.department.create({
        data: { name: "Engineering", description: "Software development team", organizationId: orgId, updatedAt: now },
      });
      department2 = await prisma.department.create({
        data: { name: "Marketing", description: "Marketing and communications", organizationId: orgId, updatedAt: now },
      });
      department3 = await prisma.department.create({
        data: { name: "Human Resources", description: "HR and people operations", organizationId: orgId, updatedAt: now },
      });
    } else {
      department1 = existingDepts[0];
      department2 = existingDepts[1] || existingDepts[0];
      department3 = existingDepts[2] || existingDepts[0];
    }

    const existingJobTitles = await prisma.jobTitle.findMany({ where: { organizationId: orgId } });
    let jobTitle1, jobTitle2, jobTitle3;
    if (existingJobTitles.length === 0) {
      jobTitle1 = await prisma.jobTitle.create({ data: { title: "Software Engineer", level: 3, organizationId: orgId, updatedAt: now } });
      jobTitle2 = await prisma.jobTitle.create({ data: { title: "Senior Software Engineer", level: 4, organizationId: orgId, updatedAt: now } });
      jobTitle3 = await prisma.jobTitle.create({ data: { title: "Engineering Manager", level: 5, organizationId: orgId, updatedAt: now } });
    } else {
      jobTitle1 = existingJobTitles[0];
      jobTitle2 = existingJobTitles[1] || existingJobTitles[0];
      jobTitle3 = existingJobTitles[2] || existingJobTitles[0];
    }

    const existingLocations = await prisma.location.findMany({ where: { organizationId: orgId } });
    let location1;
    if (existingLocations.length === 0) {
      location1 = await prisma.location.create({
        data: { name: "San Francisco HQ", address: "123 Market Street", city: "San Francisco", country: "United States", timezone: "America/Los_Angeles", organizationId: orgId, updatedAt: now },
      });
    } else {
      location1 = existingLocations[0];
    }

    const existingEmployees = await prisma.employee.findMany({ where: { organizationId: orgId }, take: 1 });
    let manager;
    if (existingEmployees.length === 0) {
      manager = await prisma.employee.create({
        data: {
          employeeId: "EMP001",
          firstName: "Sarah",
          lastName: "Johnson",
          email: "sarah.johnson@example.com",
          phone: "+1-555-0100",
          hireDate: new Date("2020-01-15"),
          status: "ACTIVE",
          organizationId: orgId,
          departmentId: department1.id,
          jobTitleId: jobTitle3.id,
          locationId: location1.id,
          updatedAt: now,
        },
      });
    } else {
      manager = existingEmployees[0];
    }

    const riskEmployees = [
      { employeeId: "RISK001", firstName: "Michael", lastName: "Thompson", email: "m.thompson@example.com", status: EmployeeStatus.OFFBOARDING },
      { employeeId: "RISK002", firstName: "Jennifer", lastName: "Williams", email: "j.williams@example.com", status: EmployeeStatus.OFFBOARDING },
      { employeeId: "RISK003", firstName: "David", lastName: "Martinez", email: "d.martinez@example.com", status: EmployeeStatus.OFFBOARDING },
    ];

    const createdEmployees = [];
    for (const emp of riskEmployees) {
      const existing = await prisma.employee.findFirst({
        where: { organizationId: orgId, employeeId: emp.employeeId },
      });
      if (!existing) {
        const created = await prisma.employee.create({
          data: {
            ...emp,
            phone: "+1-555-" + Math.floor(1000 + Math.random() * 9000),
            hireDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000 * Math.random() * 3),
            organizationId: orgId,
            departmentId: department1.id,
            jobTitleId: jobTitle1.id,
            locationId: location1.id,
            managerId: manager.id,
            updatedAt: now,
          },
        });
        createdEmployees.push(created);
      } else {
        createdEmployees.push(existing);
      }
    }

    const assets = [
      { name: "MacBook Pro 16\"", type: "LAPTOP", serialNumber: "C02X123456", assetTag: "IT-001" },
      { name: "MacBook Pro 14\"", type: "LAPTOP", serialNumber: "C02X789012", assetTag: "IT-002" },
      { name: "iPhone 14 Pro", type: "PHONE", serialNumber: "DNQX456789", assetTag: "IT-003" },
      { name: "Building Access Card", type: "ACCESS_CARD", serialNumber: null, assetTag: "ACC-001" },
      { name: "Office Keys", type: "KEYS", serialNumber: null, assetTag: "KEY-001" },
      { name: "Dell Monitor 27\"", type: "MONITOR", serialNumber: "DEL123456", assetTag: "IT-004" },
    ];

    const createdAssets = [];
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const existing = await prisma.asset.findFirst({
        where: { organizationId: orgId, assetTag: asset.assetTag },
      });
      if (!existing) {
        const employeeIndex = i % createdEmployees.length;
        const created = await prisma.asset.create({
          data: {
            ...asset,
            type: asset.type as any,
            status: "ASSIGNED",
            value: Math.floor(500 + Math.random() * 2500),
            purchaseDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000 * Math.random()),
            organizationId: orgId,
            employeeId: createdEmployees[employeeIndex]?.id || null,
            updatedAt: now,
          },
        });
        createdAssets.push(created);
      } else {
        createdAssets.push(existing);
      }
    }

    const offboardingsCreated = [];
    for (let i = 0; i < createdEmployees.length; i++) {
      const emp = createdEmployees[i];
      const existingOb = await prisma.offboarding.findFirst({
        where: { organizationId: orgId, employeeId: emp.id, status: { not: "COMPLETED" } },
      });
      
      if (!existingOb) {
        const riskLevels = ["NORMAL", "HIGH", "CRITICAL"] as const;
        const scheduledDays = [14, 7, 3];
        
        const offboarding = await prisma.offboarding.create({
          data: {
            employeeId: emp.id,
            organizationId: orgId,
            status: "IN_PROGRESS",
            scheduledDate: new Date(Date.now() + scheduledDays[i] * 24 * 60 * 60 * 1000),
            reason: ["Voluntary resignation", "Performance concerns", "Company restructuring"][i],
            riskLevel: riskLevels[i],
            riskReason: i > 0 ? `Risk assessment identified ${i + 1} concerns` : null,
            isEscalated: i === 2,
            escalationReason: i === 2 ? "Requires executive approval due to sensitive access" : null,
            requiredApprovals: i === 2 ? 2 : 1,
            updatedAt: now,
          },
        });
        offboardingsCreated.push(offboarding);

        const tasks = [
          { name: "Revoke email access", status: i === 0 ? "COMPLETED" : "PENDING", isHighRiskTask: true },
          { name: "Revoke Slack access", status: i === 0 ? "COMPLETED" : "PENDING", isHighRiskTask: true },
          { name: "Revoke AWS access", status: "PENDING", isHighRiskTask: true },
          { name: "Return equipment", status: "PENDING", isHighRiskTask: false },
          { name: "Exit interview", status: "PENDING", isHighRiskTask: false },
          { name: "Knowledge transfer", status: i === 0 ? "IN_PROGRESS" : "PENDING", isHighRiskTask: false },
        ];

        for (let j = 0; j < tasks.length; j++) {
          await prisma.offboardingTask.create({
            data: {
              offboardingId: offboarding.id,
              name: tasks[j].name,
              status: tasks[j].status as any,
              category: tasks[j].isHighRiskTask ? "Security" : "General",
              isHighRiskTask: tasks[j].isHighRiskTask,
              dueDate: new Date(Date.now() + (j + 1) * 24 * 60 * 60 * 1000),
              order: j,
              completedAt: tasks[j].status === "COMPLETED" ? now : null,
              updatedAt: now,
            },
          });
        }

        const empAssets = createdAssets.filter(a => a.employeeId === emp.id);
        for (const asset of empAssets) {
          await prisma.assetReturn.create({
            data: {
              offboardingId: offboarding.id,
              assetId: asset.id,
              status: "PENDING",
              updatedAt: now,
            },
          });
        }

        const systems = ["Slack", "GitHub", "AWS", "Google Workspace", "Salesforce"];
        for (let j = 0; j < 3; j++) {
          await prisma.accessRevocation.create({
            data: {
              offboardingId: offboarding.id,
              organizationId: orgId,
              systemName: systems[j],
              systemType: "SaaS",
              status: j === 0 && i === 0 ? "CONFIRMED" : "PENDING",
              isUrgent: i === 2,
              dueDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
              confirmedAt: j === 0 && i === 0 ? now : null,
              updatedAt: now,
            },
          });
        }

        if (i > 0) {
          const securityEventTypes = [
            { type: "LOGIN_ATTEMPT", desc: "Login attempt detected after offboarding started" },
            { type: "BLOCKED_LOGIN", desc: "Login blocked from unauthorized location" },
            { type: "SUSPICIOUS_ACTIVITY", desc: "Unusual data access pattern detected" },
          ] as const;
          
          for (let j = 0; j < i + 1; j++) {
            const eventType = securityEventTypes[j % securityEventTypes.length];
            await prisma.securityEvent.create({
              data: {
                offboardingId: offboarding.id,
                organizationId: orgId,
                employeeId: emp.id,
                eventType: eventType.type,
                description: eventType.desc,
                ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                resolved: false,
              },
            });
          }
        }

        const riskScore = [15, 45, 75][i];
        await prisma.riskScore.create({
          data: {
            offboardingId: offboarding.id,
            organizationId: orgId,
            score: riskScore,
            level: riskLevels[i],
            factors: [
              { factor: "overdue_tasks", description: `${i + 1} overdue task(s)`, weight: 10, score: (i + 1) * 5 },
              ...(i > 0 ? [{ factor: "login_attempts", description: `${i} login attempt(s) after offboarding`, weight: 10, score: i * 10 }] : []),
              ...(i > 1 ? [{ factor: "unresolved_assets", description: "Unresolved asset returns", weight: 12, score: 12 }] : []),
            ],
            calculatedBy: session.user.id,
            changeReason: "Initial calculation",
            updatedAt: now,
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        action: "seed.risk_radar_completed",
        entityType: "System",
        entityId: null,
        newData: {
          employees: createdEmployees.length,
          assets: createdAssets.length,
          offboardings: offboardingsCreated.length,
          message: "Risk Radar and Asset demo data created",
        },
        organizationId: orgId,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Risk Radar and Asset demo data created successfully",
      data: {
        employees: createdEmployees.length,
        assets: createdAssets.length,
        offboardings: offboardingsCreated.length,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to seed data" },
      { status: 500 }
    );
  }
}
