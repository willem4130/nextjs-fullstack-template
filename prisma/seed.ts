import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create test users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@simplicate.test' },
    update: {},
    create: {
      email: 'admin@simplicate.test',
      name: 'Admin User',
      role: 'ADMIN',
      simplicateEmployeeId: 'EMP-001',
    },
  })

  const teamMember1 = await prisma.user.upsert({
    where: { email: 'john@simplicate.test' },
    update: {},
    create: {
      email: 'john@simplicate.test',
      name: 'John Doe',
      role: 'TEAM_MEMBER',
      simplicateEmployeeId: 'EMP-002',
    },
  })

  const teamMember2 = await prisma.user.upsert({
    where: { email: 'jane@simplicate.test' },
    update: {},
    create: {
      email: 'jane@simplicate.test',
      name: 'Jane Smith',
      role: 'TEAM_MEMBER',
      simplicateEmployeeId: 'EMP-003',
    },
  })

  console.log('✅ Created users:', { admin, teamMember1, teamMember2 })

  // Create notification preferences for users
  await prisma.notificationPreference.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      emailEnabled: true,
      slackEnabled: false,
      inAppEnabled: true,
      contractNotifications: true,
      hoursReminders: true,
      invoiceNotifications: true,
      hoursReminderFrequency: 7,
    },
  })

  // Create test projects
  const project1 = await prisma.project.create({
    data: {
      simplicateId: 'SIMP-001',
      name: 'Website Redesign',
      description: 'Complete website overhaul for client',
      status: 'ACTIVE',
      clientName: 'Acme Corporation',
      projectNumber: 'PRJ-2024-001',
      startDate: new Date('2024-01-01'),
    },
  })

  const project2 = await prisma.project.create({
    data: {
      simplicateId: 'SIMP-002',
      name: 'Mobile App Development',
      description: 'iOS and Android app development',
      status: 'ACTIVE',
      clientName: 'Tech Startup Inc',
      projectNumber: 'PRJ-2024-002',
      startDate: new Date('2024-02-01'),
    },
  })

  const project3 = await prisma.project.create({
    data: {
      simplicateId: 'SIMP-003',
      name: 'Database Migration',
      description: 'Migrate from MySQL to PostgreSQL',
      status: 'COMPLETED',
      clientName: 'Enterprise Solutions Ltd',
      projectNumber: 'PRJ-2023-015',
      startDate: new Date('2023-11-01'),
      endDate: new Date('2024-01-15'),
    },
  })

  console.log('✅ Created projects:', { project1, project2, project3 })

  // Create contracts
  const contract1 = await prisma.contract.create({
    data: {
      projectId: project1.id,
      userId: teamMember1.id,
      templateName: 'Standard Development Contract',
      templateUrl: 'https://example.com/contracts/template-1.pdf',
      status: 'SIGNED',
      sentAt: new Date('2024-01-02'),
      signedAt: new Date('2024-01-05'),
      uploadToken: 'token-001',
      simplicateDocumentId: 'DOC-001',
    },
  })

  const contract2 = await prisma.contract.create({
    data: {
      projectId: project2.id,
      userId: teamMember2.id,
      templateName: 'Mobile Development Agreement',
      templateUrl: 'https://example.com/contracts/template-2.pdf',
      status: 'SENT',
      sentAt: new Date('2024-02-02'),
      uploadToken: 'token-002',
      simplicateDocumentId: 'DOC-002',
    },
  })

  const contract3 = await prisma.contract.create({
    data: {
      projectId: project2.id,
      userId: teamMember1.id,
      templateName: 'Mobile Development Agreement',
      status: 'PENDING',
      uploadToken: 'token-003',
    },
  })

  console.log('✅ Created contracts:', { contract1, contract2, contract3 })

  // Create hours entries
  const hoursEntry1 = await prisma.hoursEntry.create({
    data: {
      projectId: project1.id,
      userId: teamMember1.id,
      hours: 8,
      date: new Date('2024-11-18'),
      description: 'Frontend development',
      hourlyRate: 85,
      status: 'APPROVED',
      submittedAt: new Date('2024-11-18'),
      approvedAt: new Date('2024-11-19'),
      simplicateHoursId: 'HRS-001',
    },
  })

  const hoursEntry2 = await prisma.hoursEntry.create({
    data: {
      projectId: project1.id,
      userId: teamMember1.id,
      hours: 6.5,
      date: new Date('2024-11-19'),
      description: 'Backend API development',
      hourlyRate: 85,
      status: 'APPROVED',
      submittedAt: new Date('2024-11-19'),
      approvedAt: new Date('2024-11-20'),
      simplicateHoursId: 'HRS-002',
    },
  })

  const hoursEntry3 = await prisma.hoursEntry.create({
    data: {
      projectId: project2.id,
      userId: teamMember2.id,
      hours: 7,
      date: new Date('2024-11-19'),
      description: 'Mobile UI design',
      hourlyRate: 90,
      status: 'PENDING',
      submittedAt: new Date('2024-11-19'),
      simplicateHoursId: 'HRS-003',
    },
  })

  console.log('✅ Created hours entries:', { hoursEntry1, hoursEntry2, hoursEntry3 })

  // Create invoices
  const invoice1 = await prisma.invoice.create({
    data: {
      projectId: project1.id,
      invoiceNumber: 'INV-2024-001',
      amount: 1232.5, // (8 + 6.5) * 85
      description: 'Website development - November 2024',
      periodStart: new Date('2024-11-01'),
      periodEnd: new Date('2024-11-30'),
      dueDate: new Date('2024-12-15'),
      status: 'APPROVED',
      approvedAt: new Date('2024-11-20'),
      simplicateInvoiceId: 'INV-001',
    },
  })

  // Link hours to invoice
  await prisma.hoursEntry.updateMany({
    where: { id: { in: [hoursEntry1.id, hoursEntry2.id] } },
    data: { invoiceId: invoice1.id, status: 'INVOICED' },
  })

  const invoice2 = await prisma.invoice.create({
    data: {
      projectId: project2.id,
      amount: 5400,
      description: 'Mobile app development - Phase 1',
      periodStart: new Date('2024-02-01'),
      periodEnd: new Date('2024-02-28'),
      status: 'DRAFT',
    },
  })

  console.log('✅ Created invoices:', { invoice1, invoice2 })

  // Create automation logs
  const autoLog1 = await prisma.automationLog.create({
    data: {
      projectId: project1.id,
      workflowType: 'CONTRACT_DISTRIBUTION',
      status: 'SUCCESS',
      startedAt: new Date('2024-01-01T10:00:00'),
      completedAt: new Date('2024-01-01T10:00:05'),
      metadata: {
        contractsDistributed: 1,
        recipients: ['john@simplicate.test'],
      },
    },
  })

  const autoLog2 = await prisma.automationLog.create({
    data: {
      projectId: project2.id,
      workflowType: 'CONTRACT_DISTRIBUTION',
      status: 'SUCCESS',
      startedAt: new Date('2024-02-01T09:30:00'),
      completedAt: new Date('2024-02-01T09:30:08'),
      metadata: {
        contractsDistributed: 2,
        recipients: ['jane@simplicate.test', 'john@simplicate.test'],
      },
    },
  })

  const autoLog3 = await prisma.automationLog.create({
    data: {
      workflowType: 'HOURS_REMINDER',
      status: 'SUCCESS',
      startedAt: new Date('2024-11-18T08:00:00'),
      completedAt: new Date('2024-11-18T08:00:12'),
      metadata: {
        remindersSent: 3,
        projects: 2,
      },
    },
  })

  const autoLog4 = await prisma.automationLog.create({
    data: {
      projectId: project1.id,
      workflowType: 'INVOICE_GENERATION',
      status: 'SUCCESS',
      startedAt: new Date('2024-11-20T12:00:00'),
      completedAt: new Date('2024-11-20T12:00:15'),
      metadata: {
        invoiceNumber: 'INV-2024-001',
        amount: 1232.5,
      },
    },
  })

  const autoLog5 = await prisma.automationLog.create({
    data: {
      projectId: project2.id,
      workflowType: 'INVOICE_GENERATION',
      status: 'FAILED',
      startedAt: new Date('2024-11-19T15:00:00'),
      completedAt: new Date('2024-11-19T15:00:10'),
      error: 'No approved hours found for invoicing',
      retryCount: 1,
    },
  })

  console.log('✅ Created automation logs:', { autoLog1, autoLog2, autoLog3, autoLog4, autoLog5 })

  // Create notifications
  await prisma.notification.create({
    data: {
      userId: teamMember1.id,
      type: 'CONTRACT_ASSIGNED',
      title: 'New Contract Assigned',
      message: 'You have been assigned a contract for the Website Redesign project',
      channels: JSON.stringify(['EMAIL', 'IN_APP']),
      actionUrl: `/contracts/${contract1.id}`,
      sentAt: new Date('2024-01-02T10:00:00'),
      metadata: {
        projectId: project1.id,
        contractId: contract1.id,
      },
    },
  })

  await prisma.notification.create({
    data: {
      userId: teamMember2.id,
      type: 'HOURS_REMINDER',
      title: 'Hours Submission Reminder',
      message: 'Please submit your hours for the Mobile App Development project',
      channels: JSON.stringify(['EMAIL', 'IN_APP']),
      actionUrl: `/hours/submit`,
      sentAt: new Date('2024-11-18T08:00:00'),
      metadata: {
        projectId: project2.id,
      },
    },
  })

  console.log('✅ Created notifications')

  console.log('🎉 Database seeded successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
