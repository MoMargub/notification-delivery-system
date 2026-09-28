import { CampaignStatus, NotificationStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { HttpError } from '../../middleware/errorHandler';
import { campaignJobOptions, campaignQueue } from '../../queue';
import { CreateCampaignInput, ListCampaignsQuery } from './campaigns.schemas';

type Campaign = Awaited<ReturnType<typeof prisma.campaign.findUniqueOrThrow>>;

export async function findCampaign(id: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) throw new HttpError(404, 'Campaign not found');
  return campaign;
}

export async function createCampaign(input: CreateCampaignInput) {
  const { userIds, ...data } = input;
  const scheduledAt = new Date(data.scheduledAt);

  const campaign = await prisma.$transaction(
    async (tx) => {
      const created = await tx.campaign.create({ data: { ...data, scheduledAt } });
      let users: { id: number }[] = [];
      if (userIds && userIds.length > 0) {
        users = await tx.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true },
        });
      } else {
        users = await tx.user.findMany({
          select: { id: true },
        });
      }

      if (users.length === 0) throw new HttpError(400, 'No matching recipients');

      const result = await tx.campaignRecipient.createMany({
        data: users.map((u) => ({
          campaignId: created.id,
          userId: u.id,
          createdAt: new Date(),
        })),
        skipDuplicates: true,
      });

      const totalRecipients = result.count;
      if (totalRecipients === 0) throw new HttpError(400, 'No matching recipients');
      return tx.campaign.update({ where: { id: created.id }, data: { totalRecipients } });
    },
    { timeout: 60_000 },
  );

  await campaignQueue.add(
    'expand',
    { campaignId: campaign.id },
    campaignJobOptions(campaign.id, Math.max(0, scheduledAt.getTime() - Date.now())),
  );
  return campaign;
}

export async function listCampaigns({ status, channel, page, limit }: ListCampaignsQuery) {
  const where = {
    ...(status && { status: status as CampaignStatus }),
    ...(channel && { channel }),
  };
  const [items, total, groups] = await Promise.all([
    prisma.campaign.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.campaign.count({ where }),
    prisma.campaign.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  const statusCounts: Record<CampaignStatus, number> = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0 };
  for (const g of groups) statusCounts[g.status as CampaignStatus] = g._count._all;
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)), statusCounts };
}

/** Notification rows are the source of truth for progress. */
export async function countNotificationsByStatus(campaignId: string) {
  const groups = await prisma.notification.groupBy({
    by: ['status'],
    where: { campaignId },
    _count: { _all: true },
  });
  const counts: Record<NotificationStatus, number> = { PENDING: 0, PROCESSING: 0, SENT: 0, FAILED: 0 };
  for (const g of groups) counts[g.status] = g._count._all;
  return counts;
}

export async function getProgress(id: string) {
  const { status, totalRecipients } = await findCampaign(id);
  const counts = await countNotificationsByStatus(id);
  const { PROCESSING: processing = 0, SENT: completedCount = 0, FAILED: failedCount = 0 } = counts;
  return {
    status,
    totalRecipients,
    completedCount,
    failedCount,
    processing,
    // Includes recipients whose notification row has not been created yet.
    pending: Math.max(0, totalRecipients - processing - completedCount - failedCount),
  };
}

/** Start now: promote a delayed job, or (re-)enqueue if Redis lost it. Safe to call repeatedly. */
export async function processCampaign(id: string): Promise<Campaign> {
  const campaign = await findCampaign(id);
  if (campaign.status !== CampaignStatus.PENDING && campaign.status !== CampaignStatus.PROCESSING) {
    throw new HttpError(409, `Campaign is already ${campaign.status.toLowerCase()}`);
  }
  const job = await campaignQueue.getJob(`campaign-${id}`);
  if (!job) await campaignQueue.add('expand', { campaignId: id }, campaignJobOptions(id));
  else if (await job.isDelayed()) await job.promote();
  return campaign;
}
