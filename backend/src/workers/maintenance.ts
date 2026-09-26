import { NOW_UTC, prisma } from '../config/db';
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
    const { SENT: completedCount, FAILED: failedCount } = await countNotificationsByStatus(campaign.id);
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

/** Notifications stuck in PROCESSING (worker crashed mid-send) go back to PENDING and are re-enqueued. */
export async function recoverStuckNotifications(): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ id: number }>>`
    UPDATE notifications
    SET status = 'PENDING', "updatedAt" = ${NOW_UTC}
    WHERE status = 'PROCESSING'
      AND id IN (
        SELECT id FROM notifications
        WHERE status = 'PROCESSING'
          AND "processingStartedAt" < ${NOW_UTC} - make_interval(secs => ${env.PROCESSING_TIMEOUT_SECONDS})
        LIMIT ${RECOVERY_BATCH})
    RETURNING id`;
  await notificationQueue.addBulk(rows.map((r) => notificationJob(r.id)));
  return rows.length;
}

export async function runMaintenance(): Promise<void> {
  await recoverStuckNotifications();
  await reconcileCampaigns();
}
