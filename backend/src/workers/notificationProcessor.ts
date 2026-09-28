import { prisma } from '../config/db';
import { env } from '../config/env';
import { providers } from '../providers';

export type ProcessResult = 'sent' | 'failed' | 'skipped';

/**
 * Delivers one notification. Throws only when BullMQ should retry (attempts remain);
 * the retry budget is derived from retryCount in the database, so it survives worker restarts.
 */
export async function processNotification(notificationId: number): Promise<ProcessResult> {
  // Atomic claim: only the worker that flips PENDING -> PROCESSING may deliver.
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, status: 'PENDING' },
    data: {
      status: 'PROCESSING',
      processingStartedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  if (result.count === 0) return 'skipped';

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) return 'skipped';

  const attemptNumber = notification.retryCount + 1;

  const provider = providers[notification.channel];
  if (!provider) {
    throw new Error(`No provider registered for channel: ${notification.channel}`);
  }

  try {
    await provider.send(notification);
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
