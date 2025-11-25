/**
 * Queue Processor Cron
 *
 * Processes pending items in WorkflowQueue
 * Triggered by Vercel Cron every minute
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { WorkflowType, QueueStatus } from '@prisma/client';
import { runContractDistribution } from '@/lib/workflows/contract-distribution';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max for cron jobs

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow without secret
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // If CRON_SECRET is set, verify it
  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }

  // If no secret configured, allow (but log warning)
  console.warn('[Cron] No CRON_SECRET configured - allowing request');
  return true;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] Processing queue started');

    // Get pending items scheduled for now or earlier
    const pendingItems = await prisma.workflowQueue.findMany({
      where: {
        status: QueueStatus.PENDING,
        scheduledFor: { lte: new Date() },
        attempts: { lt: prisma.workflowQueue.fields.maxAttempts },
      },
      orderBy: { scheduledFor: 'asc' },
      take: 10, // Process up to 10 items per run
    });

    console.log(`[Cron] Found ${pendingItems.length} pending items`);

    const results = await Promise.allSettled(
      pendingItems.map((item) => processQueueItem(item))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log('[Cron] Processing complete:', { succeeded, failed });

    return NextResponse.json({
      success: true,
      processed: pendingItems.length,
      succeeded,
      failed,
    });
  } catch (error) {
    console.error('[Cron] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function processQueueItem(item: {
  id: string;
  workflowType: WorkflowType;
  projectId: string | null;
  userId: string | null;
  payload: any;
  attempts: number;
  maxAttempts: number;
}) {
  console.log(`[Cron] Processing item ${item.id} (${item.workflowType})`);

  // Mark as processing
  await prisma.workflowQueue.update({
    where: { id: item.id },
    data: {
      status: QueueStatus.PROCESSING,
      startedAt: new Date(),
      attempts: item.attempts + 1,
    },
  });

  try {
    // Execute workflow based on type
    switch (item.workflowType) {
      case WorkflowType.CONTRACT_DISTRIBUTION:
        await processContractDistribution(item);
        break;

      case WorkflowType.HOURS_REMINDER:
        await processHoursReminder(item);
        break;

      case WorkflowType.INVOICE_GENERATION:
        await processInvoiceGeneration(item);
        break;

      default:
        throw new Error(`Unknown workflow type: ${item.workflowType}`);
    }

    // Mark as completed
    await prisma.workflowQueue.update({
      where: { id: item.id },
      data: {
        status: QueueStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    console.log(`[Cron] Item ${item.id} completed successfully`);
  } catch (error) {
    console.error(`[Cron] Item ${item.id} failed:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const newAttempts = item.attempts + 1;

    // Mark as failed if max attempts reached, otherwise back to pending
    await prisma.workflowQueue.update({
      where: { id: item.id },
      data: {
        status: newAttempts >= item.maxAttempts ? QueueStatus.FAILED : QueueStatus.PENDING,
        error: errorMessage,
        // Exponential backoff: 1min, 5min, 15min
        scheduledFor: newAttempts >= item.maxAttempts
          ? undefined
          : new Date(Date.now() + Math.pow(5, newAttempts) * 60 * 1000),
      },
    });

    throw error;
  }
}

/**
 * Process contract distribution for a specific employee linked to a project
 */
async function processContractDistribution(item: {
  projectId: string | null;
  userId: string | null;
  payload: any;
}) {
  const { projectId, payload } = item;

  if (!projectId) {
    throw new Error('Missing projectId for contract distribution');
  }

  // If we have specific employee info, process just that employee
  if (payload.employeeId) {
    await runContractDistributionForEmployee({
      projectId,
      employeeId: payload.employeeId,
      employeeName: payload.employeeName,
      employeeEmail: payload.employeeEmail,
    });
  } else {
    // Fallback to processing all employees on the project
    await runContractDistribution({ projectId });
  }
}

/**
 * Run contract distribution for a single employee
 */
async function runContractDistributionForEmployee(options: {
  projectId: string;
  employeeId: string;
  employeeName?: string;
  employeeEmail?: string;
}) {
  const { projectId, employeeId, employeeName, employeeEmail } = options;

  // Get project
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { simplicateEmployeeId: employeeId },
  });

  if (!user && employeeEmail) {
    // Try to find by email
    user = await prisma.user.findUnique({
      where: { email: employeeEmail },
    });

    if (user && !user.simplicateEmployeeId) {
      // Link existing user to Simplicate employee
      user = await prisma.user.update({
        where: { id: user.id },
        data: { simplicateEmployeeId: employeeId },
      });
    }
  }

  if (!user && employeeEmail) {
    // Create new user
    user = await prisma.user.create({
      data: {
        email: employeeEmail,
        name: employeeName,
        simplicateEmployeeId: employeeId,
        role: 'TEAM_MEMBER',
      },
    });
    console.log('[ContractDist] Created user:', user.id);
  }

  if (!user) {
    console.warn('[ContractDist] Could not find or create user for employee:', employeeId);
    return;
  }

  // Check if contract already exists for this user/project combo
  const existingContract = await prisma.contract.findFirst({
    where: {
      projectId,
      userId: user.id,
    },
  });

  if (existingContract) {
    console.log('[ContractDist] Contract already exists:', existingContract.id);
    return;
  }

  // Import crypto for upload token
  const crypto = await import('crypto');
  const uploadToken = crypto.randomBytes(32).toString('hex');

  // Create contract record
  const contract = await prisma.contract.create({
    data: {
      projectId,
      userId: user.id,
      templateName: 'Standard Contract',
      uploadToken,
      status: 'PENDING',
    },
  });

  // Create notification
  const appUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  const uploadUrl = `${appUrl}/workspace/contracts/${contract.id}/upload?token=${uploadToken}`;

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'CONTRACT_ASSIGNED',
      title: 'Contract Required',
      message: `You've been assigned to project "${project.name}" and need to sign a contract.`,
      actionUrl: uploadUrl,
      channels: JSON.stringify(['EMAIL', 'IN_APP']),
      metadata: {
        projectId,
        contractId: contract.id,
        uploadUrl,
      },
    },
  });

  // Update contract status
  await prisma.contract.update({
    where: { id: contract.id },
    data: {
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  console.log('[ContractDist] Contract created and notification sent:', contract.id);

  // Create automation log
  await prisma.automationLog.create({
    data: {
      projectId,
      workflowType: 'CONTRACT_DISTRIBUTION',
      status: 'SUCCESS',
      completedAt: new Date(),
      metadata: {
        contractId: contract.id,
        userId: user.id,
        employeeId,
      },
    },
  });
}

/**
 * Process hours reminder workflow (placeholder)
 */
async function processHoursReminder(item: {
  projectId: string | null;
  userId: string | null;
  payload: any;
}) {
  // TODO: Implement in Phase 4
  console.log('[Cron] Hours reminder not yet implemented');
}

/**
 * Process invoice generation workflow (placeholder)
 */
async function processInvoiceGeneration(item: {
  projectId: string | null;
  userId: string | null;
  payload: any;
}) {
  // TODO: Implement in Phase 5
  console.log('[Cron] Invoice generation not yet implemented');
}
