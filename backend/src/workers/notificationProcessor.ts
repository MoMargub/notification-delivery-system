import { Notification } from '@prisma/client';
import { NOW_UTC, prisma } from '../config/db';
import { env } from '../config/env';
import { providers } from '../providers';

export type ProcessResult = 'sent' | 'failed' | 'skipped';

/**
 * Delivers one notification. Throws only when BullMQ should retry (attempts remain);
 * the retry budget is derived from retryCount in the database, so it survives worker restarts.
 */
export async function processNotification(notificationId: number): Promise<ProcessResult> {
  // Atomic claim: only the worker that flips PENDING -> PROCESSING may deliver.
  const [notification] = await prisma.$queryRaw<Notification[]>`
    UPDATE notifications
    SET status = 'PROCESSING', "processingStartedAt" = ${NOW_UTC}, "updatedAt" = ${NOW_UTC}
    WHERE id = ${notificationId} AND status = 'PENDING'
    RETURNING *`;
  if (!notification) return 'skipped';

  const attemptNumber = notification.retryCount + 1;

  try {
    await providers[notification.channel].send(notification);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const isLastAttempt = attemptNumber >= env.MAX_NOTIFICATION_RETRIES;
    await prisma.$transaction([
      prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: isLastAttempt ? 'FAILED' : 'PENDING',
          retryCount: { increment: 1 },
          lastError: errorMessage,
          processedAt: isLastAttempt ? new Date() : null,
        },
      }),
      prisma.notificationAttempt.create({
        data: { notificationId, attemptNumber, status: 'FAILED', errorMessage },
      }),
    ]);
    if (!isLastAttempt) throw err;
    return 'failed';
  }

  await prisma.$transaction([
    prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'SENT', processedAt: new Date(), lastError: null },
    }),
    prisma.notificationAttempt.create({ data: { notificationId, attemptNumber, status: 'SUCCESS' } }),
  ]);
  return 'sent';
}
