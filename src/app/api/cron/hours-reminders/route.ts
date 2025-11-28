/**
 * Hours Reminders Cron
 *
 * Runs weekly to remind employees who haven't submitted hours
 * Triggered by Vercel Cron every Monday at 9 AM CET
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
  console.warn('[HoursReminders] No CRON_SECRET configured - allowing request');
  return true;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[HoursReminders] Weekly cron started');

    // Add item to workflow queue for processing
    const queueItem = await prisma.workflowQueue.create({
      data: {
        workflowType: 'HOURS_REMINDER',
        payload: {
          period: 'previous', // Remind about previous month
          triggeredBy: 'cron',
          triggeredAt: new Date().toISOString(),
        },
        status: 'PENDING',
        scheduledFor: new Date(),
      },
    });

    console.log('[HoursReminders] Queue item created:', queueItem.id);

    return NextResponse.json({
      success: true,
      message: 'Hours reminder queued for processing',
      queueItemId: queueItem.id,
    });
  } catch (error) {
    console.error('[HoursReminders] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
