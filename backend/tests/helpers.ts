import { Channel } from '@prisma/client';
import { prisma } from '../src/config/db';

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE notification_attempts, notifications, campaign_recipients, campaigns, users RESTART IDENTITY CASCADE',
  );
}

/** Users with ids 1..count. */
export async function seedUsers(count: number) {
  await prisma.user.createMany({
    data: Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `User ${i + 1}`, email: `u${i + 1}@test.dev` })),
  });
}

/** A campaign whose recipients are the given users, ready to be expanded. */
export async function createCampaignFor(userIds: number[], channel: Channel = 'EMAIL') {
  return prisma.campaign.create({
    data: {
      title: 'Test campaign',
      message: 'Hello from the test suite',
      channel,
      scheduledAt: new Date(),
      totalRecipients: userIds.length,
      recipients: { create: userIds.map((userId) => ({ userId })) },
    },
  });
}

export async function createNotification(campaignId: string, userId: number, data: Partial<Record<string, unknown>> = {}) {
  return prisma.notification.create({
    data: { campaignId, userId, channel: 'EMAIL', message: 'Hello from the test suite', ...data },
  });
}
