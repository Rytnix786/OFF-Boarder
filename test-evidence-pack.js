const { PrismaClient } = require('@prisma/client');
const { Prisma } = require('@prisma/client');

const prisma = new PrismaClient();

async function testEvidencePack() {
  try {
    console.log('Testing evidence pack generation...');
    
    // Test if we can fetch the offboarding data
    const offboarding = await prisma.offboarding.findFirst({
      where: { id: 'cmks6pixz0001i4wj5tintmi7' },
      include: {
        employee: true,
        tasks: {
          include: {
            evidence: true,
          },
        },
        approvals: true,
        assetReturns: true,
        accessRevocations: true,
        organization: true,
      },
    });

    if (!offboarding) {
      console.error('Offboarding not found');
      return;
    }

    console.log('Offboarding found:', {
      id: offboarding.id,
      status: offboarding.status,
      employee: `${offboarding.employee?.firstName} ${offboarding.employee?.lastName}`,
      tasksCount: offboarding.tasks.length,
      approvalsCount: offboarding.approvals.length,
    });

    // Test evidence pack creation
    const evidencePack = await prisma.evidencePack.upsert({
      where: { offboardingId: offboarding.id },
      update: {
        generatedAt: new Date(),
        generatedBy: 'test-user',
        checksum: 'test-checksum',
        version: { increment: 1 },
      },
      create: {
        offboardingId: offboarding.id,
        organizationId: offboarding.organizationId,
        generatedBy: 'test-user',
        checksum: 'test-checksum',
        data: {},
      },
    });

    console.log('Evidence pack created/updated:', evidencePack.id);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEvidencePack();
