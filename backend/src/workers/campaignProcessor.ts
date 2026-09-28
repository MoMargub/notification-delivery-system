import { prisma } from '../config/db';
import { env } from '../config/env';
import { notificationJob, notificationQueue } from '../queue';

/**
 * Expands a campaign into notifications, RECIPIENT_BATCH_SIZE recipients at a time.
 * Keyset scan over the (campaignId, userId) unique index: memory stays O(batch), and the
 * whole function is safe to re-run (inserts are ON CONFLICT DO NOTHING, job ids are deterministic).
 */
export async function expandCampaign(campaignId: string): Promise<void> {
  const campaignPreCheck = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { status: true, startedAt: true },
  });

  if (!campaignPreCheck || !['PENDING', 'PROCESSING'].includes(campaignPreCheck.status)) {
    return;
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: 'PROCESSING',
      startedAt: campaignPreCheck.startedAt ?? new Date(),
      updatedAt: new Date(),
    },
  });

  const { channel, message } = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });

  let cursor = 0;
  for (;;) {
    const batch = await prisma.campaignRecipient.findMany({
      where: { campaignId, userId: { gt: cursor } },
      orderBy: { userId: 'asc' },
      take: env.RECIPIENT_BATCH_SIZE,
      select: { userId: true },
    });
    if (batch.length === 0) break;
    const userIds = batch.map((r) => r.userId);

    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        campaignId,
        userId,
        channel,
        message,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      skipDuplicates: true,
    });

    // Enqueue everything still PENDING (not only new rows) so a crash between insert and
    // enqueue is healed on re-run. Duplicate jobIds are ignored by BullMQ.
    const pending = await prisma.notification.findMany({
      where: { campaignId, channel, userId: { in: userIds }, status: 'PENDING' },
      select: { id: true },
    });
    await notificationQueue.addBulk(pending.map((n: { id: number }) => notificationJob(n.id)));

    cursor = userIds[userIds.length - 1]!;
  }
}
