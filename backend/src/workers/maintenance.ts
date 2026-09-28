import { prisma } from '../config/db';
import { env } from '../config/env';
import { countNotificationsByStatus } from '../modules/campaigns/campaigns.service';
import { notificationJob, notificationQueue } from '../queue';

const RECOVERY_BATCH = 1000;

/**
 * Batched progress: one grouped read and at most one UPDATE per active campaign per tick,
 * instead of a counter update per notification.
 * COMPLETED when every recipient has a terminal notification and at least one was sent, FAILED otherwise.
 */
export async function reconcileCampaigns(): Promise<void> {
  const active = await prisma.campaign.findMany({
    where: { status: 'PROCESSING' },
    select: { id: true, totalRecipients: true, completedCount: true, failedCount: true },
  });

  for (const campaign of active) {
    const { SENT: completedCount = 0, FAILED: failedCount = 0 } = await countNotificationsByStatus(campaign.id);
    const finished = completedCount + failedCount >= campaign.totalRecipients;
    const changed = completedCount !== campaign.completedCount || failedCount !== campaign.failedCount;
    if (!finished && !changed) continue;

    await prisma.campaign.updateMany({
      where: { id: campaign.id, status: 'PROCESSING' },
      data: {
        completedCount,
        failedCount,
        ...(finished && { status: completedCount > 0 ? 'COMPLETED' : 'FAILED', completedAt: new Date() }),
      },
    });
  }
}

export async function recoverStuckNotifications(): Promise<number> {
  const timeoutDate = new Date(Date.now() - env.PROCESSING_TIMEOUT_SECONDS * 1000);
  
  const stuckNotifications = await prisma.notification.findMany({
    where: {
      status: 'PROCESSING',
      processingStartedAt: {
        lt: timeoutDate,
      },
    },
    select: { id: true },
    take: RECOVERY_BATCH,
  });

  const ids = stuckNotifications.map((n) => n.id);

  if (ids.length > 0) {
    await prisma.notification.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        status: 'PENDING',
        updatedAt: new Date(),
      },
    });
    
    await notificationQueue.addBulk(ids.map((id) => notificationJob(id)));
  }

  return ids.length;
}

export async function runMaintenance(): Promise<void> {
  await recoverStuckNotifications();
  await reconcileCampaigns();
}
