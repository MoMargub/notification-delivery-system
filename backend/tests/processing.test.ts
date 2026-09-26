import { prisma } from '../src/config/db';
import { notificationQueue } from '../src/queue';
import { providers } from '../src/providers';
import { expandCampaign } from '../src/workers/campaignProcessor';
import { reconcileCampaigns, recoverStuckNotifications } from '../src/workers/maintenance';
import { processNotification } from '../src/workers/notificationProcessor';
import { createCampaignFor, createNotification, resetDb, seedUsers } from './helpers';

jest.mock('../src/queue', () => require('./queueMock'));

const addBulk = notificationQueue.addBulk as unknown as jest.Mock;

beforeEach(async () => {
  jest.restoreAllMocks();
  addBulk.mockClear();
  await resetDb();
  await seedUsers(60);
});
afterAll(() => prisma.$disconnect());

describe('campaign expansion (RECIPIENT_BATCH_SIZE=3)', () => {
  it('processes recipients in bounded batches', async () => {
    const campaign = await createCampaignFor(Array.from({ length: 10 }, (_, i) => i + 1));

    await expandCampaign(campaign.id);

    expect(addBulk.mock.calls.map(([jobs]) => jobs.length)).toEqual([3, 3, 3, 1]);
    expect(await prisma.notification.count({ where: { campaignId: campaign.id, status: 'PENDING' } })).toBe(10);
    expect((await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } })).status).toBe('PROCESSING');
  });

  it('is idempotent: re-running creates no duplicates and re-enqueues the same deterministic job ids', async () => {
    const campaign = await createCampaignFor([1, 2, 3, 4]);

    await expandCampaign(campaign.id);
    const firstIds = addBulk.mock.calls.flatMap(([jobs]) => jobs.map((j: { opts: { jobId: string } }) => j.opts.jobId));
    addBulk.mockClear();
    await expandCampaign(campaign.id);
    const secondIds = addBulk.mock.calls.flatMap(([jobs]) => jobs.map((j: { opts: { jobId: string } }) => j.opts.jobId));

    expect(await prisma.notification.count()).toBe(4);
    expect(secondIds).toEqual(firstIds);
  });

  it('skips campaigns that are already finished', async () => {
    const campaign = await createCampaignFor([1, 2]);
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'COMPLETED' } });

    await expandCampaign(campaign.id);

    expect(await prisma.notification.count()).toBe(0);
    expect(addBulk).not.toHaveBeenCalled();
  });
});

describe('notification processing', () => {
  it('lets exactly one of many concurrent workers deliver a notification', async () => {
    const campaign = await createCampaignFor([1]);
    const n = await createNotification(campaign.id, 1);
    const send = jest.spyOn(providers.EMAIL, 'send');

    const results = await Promise.all(Array.from({ length: 10 }, () => processNotification(n.id)));

    expect(results.filter((r) => r === 'sent')).toHaveLength(1);
    expect(results.filter((r) => r === 'skipped')).toHaveLength(9);
    expect(send).toHaveBeenCalledTimes(1);
    expect(await prisma.notificationAttempt.count({ where: { notificationId: n.id } })).toBe(1);
  });

  it('retries transient failures and succeeds on the third attempt', async () => {
    const campaign = await createCampaignFor([10]);
    const n = await createNotification(campaign.id, 10);

    await expect(processNotification(n.id)).rejects.toThrow('temporary');
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: n.id } })).status).toBe('PENDING');
    await expect(processNotification(n.id)).rejects.toThrow('temporary');
    await expect(processNotification(n.id)).resolves.toBe('sent');

    const row = await prisma.notification.findUniqueOrThrow({
      where: { id: n.id },
      include: { attempts: { orderBy: { attemptNumber: 'asc' } } },
    });
    expect(row).toMatchObject({ status: 'SENT', retryCount: 2, lastError: null });
    expect(row.processedAt).not.toBeNull();
    expect(row.attempts.map((a) => [a.attemptNumber, a.status])).toEqual([
      [1, 'FAILED'],
      [2, 'FAILED'],
      [3, 'SUCCESS'],
    ]);
  });

  it('gives up after MAX_NOTIFICATION_RETRIES and never retries forever', async () => {
    const campaign = await createCampaignFor([50]);
    const n = await createNotification(campaign.id, 50);

    await expect(processNotification(n.id)).rejects.toThrow('permanently');
    await expect(processNotification(n.id)).rejects.toThrow('permanently');
    await expect(processNotification(n.id)).resolves.toBe('failed'); // last attempt: no throw, no BullMQ retry
    await expect(processNotification(n.id)).resolves.toBe('skipped'); // terminal

    const row = await prisma.notification.findUniqueOrThrow({ where: { id: n.id } });
    expect(row).toMatchObject({ status: 'FAILED', retryCount: 3, lastError: expect.stringContaining('permanently') });
    expect(await prisma.notificationAttempt.count({ where: { notificationId: n.id, status: 'FAILED' } })).toBe(3);
  });
});

describe('maintenance', () => {
  it('recovers notifications stuck in PROCESSING past the timeout, and only those', async () => {
    const campaign = await createCampaignFor([1, 2]);
    const stuck = await createNotification(campaign.id, 1, {
      status: 'PROCESSING',
      processingStartedAt: new Date(Date.now() - 600_000),
    });
    const fresh = await createNotification(campaign.id, 2, { status: 'PROCESSING', processingStartedAt: new Date() });

    expect(await recoverStuckNotifications()).toBe(1);

    expect((await prisma.notification.findUniqueOrThrow({ where: { id: stuck.id } })).status).toBe('PENDING');
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: fresh.id } })).status).toBe('PROCESSING');
    expect(addBulk.mock.calls[0]![0].map((j: { data: { notificationId: number } }) => j.data.notificationId)).toEqual([stuck.id]);
  });

  it('completes a campaign only when every recipient is in a terminal state', async () => {
    const campaign = await createCampaignFor([1, 2, 3]);
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'PROCESSING' } });
    await createNotification(campaign.id, 1, { status: 'SENT' });
    await createNotification(campaign.id, 2, { status: 'FAILED' });

    await reconcileCampaigns(); // recipient 3 has no notification yet
    let row = await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } });
    expect(row).toMatchObject({ status: 'PROCESSING', completedCount: 1, failedCount: 1 });

    await createNotification(campaign.id, 3, { status: 'SENT' });
    await reconcileCampaigns();
    row = await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } });
    expect(row).toMatchObject({ status: 'COMPLETED', completedCount: 2, failedCount: 1 });
    expect(row.completedAt).not.toBeNull();
  });

  it('marks a campaign FAILED when nothing was delivered', async () => {
    const campaign = await createCampaignFor([1]);
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'PROCESSING' } });
    await createNotification(campaign.id, 1, { status: 'FAILED' });

    await reconcileCampaigns();

    expect((await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } })).status).toBe('FAILED');
  });
});
