import { Campaign, NotificationStatus, Prisma } from '@prisma/client';
import { NOW_UTC, prisma } from '../../config/db';
import { HttpError } from '../../middleware/errorHandler';
import { campaignJobOptions, campaignQueue } from '../../queue';
import { CreateCampaignInput, ListCampaignsQuery } from './campaigns.schemas';

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
      // Set-based insert: one statement for any audience size, never materialised in Node.
      const filter = userIds ? Prisma.sql`WHERE u.id = ANY(${userIds}::int[])` : Prisma.empty;
      const totalRecipients = await tx.$executeRaw`
        INSERT INTO campaign_recipients ("campaignId", "userId", "createdAt")
        SELECT ${created.id}::text, u.id, ${NOW_UTC} FROM users u ${filter}
        ON CONFLICT DO NOTHING`;
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
  const where: Prisma.CampaignWhereInput = {
    ...(status && { status }),
    ...(channel && { channel }),
  };
  const [items, total, groups] = await Promise.all([
    prisma.campaign.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.campaign.count({ where }),
    prisma.campaign.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  const statusCounts = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0 };
  for (const g of groups) statusCounts[g.status] = g._count._all;
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
  const { PROCESSING: processing, SENT: completedCount, FAILED: failedCount } = counts;
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
  if (campaign.status !== 'PENDING' && campaign.status !== 'PROCESSING') {
    throw new HttpError(409, `Campaign is already ${campaign.status.toLowerCase()}`);
  }
  const job = await campaignQueue.getJob(`campaign-${id}`);
  if (!job) await campaignQueue.add('expand', { campaignId: id }, campaignJobOptions(id));
  else if (await job.isDelayed()) await job.promote();
  return campaign;
}
