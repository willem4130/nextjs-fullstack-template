/**
 * Centralized Error Handler
 *
 * Captures and tracks errors with deduplication, severity classification, and alerting.
 */

import { prisma } from '@/lib/db'
import { ErrorSeverity, ErrorCategory } from '@prisma/client'

interface CaptureErrorOptions {
  severity: ErrorSeverity
  category: ErrorCategory
  errorType: string
  message: string
  stackTrace?: string
  context?: Record<string, any>
  automationLogId?: string
  queueItemId?: string
  projectId?: string
}

/**
 * Capture error with deduplication and alerting
 *
 * Features:
 * - Deduplicates errors by errorType + related entity (automationLogId, queueItemId, projectId)
 * - Creates in-app notifications for CRITICAL/HIGH severity
 * - Email alerts for CRITICAL severity (to willem@scex.nl)
 * - Auto-resolution after 24 hours of no occurrences
 */
export async function captureError(options: CaptureErrorOptions) {
  const {
    severity,
    category,
    errorType,
    message,
    stackTrace,
    context,
    automationLogId,
    queueItemId,
    projectId,
  } = options

  // 1. Check if similar error exists (deduplication)
  const existingError = await prisma.errorRecord.findFirst({
    where: {
      errorType,
      status: 'ACTIVE',
      ...(automationLogId && { automationLogId }),
      ...(queueItemId && { queueItemId }),
      ...(projectId && { projectId }),
    },
  })

  let errorRecord

  if (existingError) {
    // Update existing error (increment occurrence count)
    errorRecord = await prisma.errorRecord.update({
      where: { id: existingError.id },
      data: {
        occurrenceCount: { increment: 1 },
        lastOccurrence: new Date(),
        message, // Update with latest message
        stackTrace: stackTrace || existingError.stackTrace,
        context: context ? (context as any) : existingError.context,
      },
    })
  } else {
    // Create new error record
    errorRecord = await prisma.errorRecord.create({
      data: {
        severity,
        category,
        errorType,
        message,
        stackTrace,
        context,
        automationLogId,
        queueItemId,
        projectId,
        status: 'ACTIVE',
      },
    })
  }

  // 3. If critical, trigger email alert (to willem@scex.nl)
  if (severity === 'CRITICAL') {
    await sendCriticalAlert({
      errorId: errorRecord.id,
      severity,
      category,
      errorType,
      message,
      context,
    }).catch((err) => {
      // Don't let alert failures prevent error capture
      console.error('[ErrorHandler] Failed to send critical alert:', err)
    })
  }

  // 4. Create in-app notification (for HIGH and above)
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    // Find admin user (willem@scex.nl)
    const adminUser = await prisma.user.findUnique({
      where: { email: 'willem@scex.nl' },
    })

    if (adminUser) {
      await prisma.notification.create({
        data: {
          userId: adminUser.id,
          type: 'SYSTEM_ALERT',
          title: `${severity} Error: ${errorType}`,
          message: message.substring(0, 200),
          actionUrl: `/admin/errors/${errorRecord.id}`,
          channels: JSON.stringify(['IN_APP']),
        },
      }).catch((err) => {
        console.error('[ErrorHandler] Failed to create notification:', err)
      })
    }
  }

  return errorRecord
}

/**
 * Classify error severity automatically based on error type and context
 */
export function classifyErrorSeverity(
  error: Error,
  context?: Record<string, any>
): ErrorSeverity {
  // Email service down → CRITICAL
  if (error.message.includes('ECONNREFUSED') && context?.service === 'email') {
    return 'CRITICAL'
  }

  // Database errors → CRITICAL
  if (error.message.includes('database') || error.message.includes('Prisma')) {
    return 'CRITICAL'
  }

  // Workflow failures with max retries → HIGH
  if (context?.attempts && context?.maxAttempts && context.attempts >= context.maxAttempts) {
    return 'HIGH'
  }

  // Simplicate API auth failures → HIGH
  if (error.message.includes('401') || error.message.includes('Unauthorized')) {
    return 'HIGH'
  }

  // Rate limits, timeouts → MEDIUM
  if (error.message.includes('429') || error.message.includes('timeout')) {
    return 'MEDIUM'
  }

  // Default to MEDIUM
  return 'MEDIUM'
}

/**
 * Send critical alert email to willem@scex.nl
 */
async function sendCriticalAlert(data: {
  errorId: string
  severity: ErrorSeverity
  category: ErrorCategory
  errorType: string
  message: string
  context?: Record<string, any>
}) {
  // Only send to willem@scex.nl per CLAUDE.md testing constraint
  const { Resend } = await import('resend')
  const resendApiKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.EMAIL_FROM || 'noreply@simplicate-automations.vercel.app'

  if (!resendApiKey) {
    console.warn('[ErrorHandler] RESEND_API_KEY not configured, skipping critical alert email')
    return
  }

  const resend = new Resend(resendApiKey)
  const appUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'https://simplicate-automations.vercel.app'

  await resend.emails.send({
    from: emailFrom,
    to: ['willem@scex.nl'],
    subject: `🚨 CRITICAL ERROR: ${data.errorType}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
            .alert-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px 20px; margin: 20px 0; }
            .button { display: inline-block; padding: 14px 28px; background: #dc2626; color: white !important; text-decoration: none; border-radius: 6px; margin: 10px 5px; font-weight: 600; }
            .footer { text-align: center; margin-top: 20px; color: #718096; font-size: 12px; }
            pre { background: #f7fafc; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">🚨 Critical Error Alert</h1>
          </div>
          <div class="content">
            <div class="alert-box">
              <strong>Severity:</strong> ${data.severity}<br>
              <strong>Category:</strong> ${data.category}<br>
              <strong>Error Type:</strong> ${data.errorType}
            </div>

            <h3>Error Message</h3>
            <p>${data.message}</p>

            ${data.context ? `
              <h3>Context</h3>
              <pre>${JSON.stringify(data.context, null, 2)}</pre>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/admin/errors/${data.errorId}" class="button">View Error Details</a>
            </div>

            <p style="font-size: 14px; color: #718096;">
              This is an automated alert for critical system errors requiring immediate attention.
            </p>
          </div>
          <div class="footer">
            <p>Simplicate Automation System - Executive Dashboard</p>
          </div>
        </body>
      </html>
    `,
  })
}
