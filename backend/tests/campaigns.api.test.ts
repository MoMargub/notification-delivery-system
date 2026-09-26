import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';
import { campaignQueue } from '../src/queue';
import { createCampaignFor, resetDb, seedUsers } from './helpers';

jest.mock('../src/queue', () => require('./queueMock'));

const queue = campaignQueue as unknown as { add: jest.Mock; getJob: jest.Mock };

const valid = {
  title: 'Autumn sale',
  message: 'Everything is 20% off this week',
  channel: 'EMAIL',
  scheduledAt: new Date(Date.now() + 3_600_000).toISOString(),
};

beforeEach(async () => {
  jest.clearAllMocks();
  await resetDb();
  await seedUsers(10);
});
afterAll(() => prisma.$disconnect());

describe('POST /api/campaigns', () => {
  it.each([
    ['short title', { title: 'ab' }],
    ['short message', { message: 'too short' }],
    ['unknown channel', { channel: 'SMS' }],
    ['bad date', { scheduledAt: 'tomorrow' }],
    ['empty userIds', { userIds: [] }],
  ])('rejects %s with 400', async (_name, override) => {
    const res = await request(app)
      .post('/api/campaigns')
      .send({ ...valid, ...override });
    expect(res.status).toBe(400);
    expect(res.body.error.details.length).toBeGreaterThan(0);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('persists all users as recipients, queues one delayed job and returns 202', async () => {
    const res = await request(app).post('/api/campaigns').send(valid);

    expect(res.status).toBe(202);
    expect(res.body).toMatchObject({ status: 'PENDING', totalRecipients: 10 });
    expect(await prisma.campaignRecipient.count({ where: { campaignId: res.body.id } })).toBe(10);
    expect(await prisma.notification.count()).toBe(0); // expansion happens in the worker

    expect(queue.add).toHaveBeenCalledTimes(1);
    const [name, data, opts] = queue.add.mock.calls[0];
    expect(name).toBe('expand');
    expect(data).toEqual({ campaignId: res.body.id });
    expect(opts.jobId).toBe(`campaign-${res.body.id}`);
    expect(opts.delay).toBeGreaterThan(3_000_000);
  });

  it('dedupes selected users and ignores unknown ids', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .send({ ...valid, userIds: [1, 1, 2, 9999] });
    expect(res.status).toBe(202);
    expect(res.body.totalRecipients).toBe(2);
  });

  it('rejects a campaign with no matching recipients and leaves nothing behind', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .send({ ...valid, userIds: [9999] });
    expect(res.status).toBe(400);
    expect(await prisma.campaign.count()).toBe(0);
    expect(queue.add).not.toHaveBeenCalled();
  });
});

describe('GET /api/campaigns', () => {
  it('paginates, filters and returns status counts', async () => {
    for (let i = 0; i < 3; i++) await createCampaignFor([1]);
    const done = await createCampaignFor([1], 'PUSH');
    await prisma.campaign.update({ where: { id: done.id }, data: { status: 'COMPLETED' } });

    const page = await request(app).get('/api/campaigns?limit=2&page=2');
    expect(page.status).toBe(200);
    expect(page.body).toMatchObject({ total: 4, totalPages: 2, statusCounts: { PENDING: 3, COMPLETED: 1 } });
    expect(page.body.items).toHaveLength(2);

    const filtered = await request(app).get('/api/campaigns?channel=PUSH&status=COMPLETED');
    expect(filtered.body.items.map((c: { id: string }) => c.id)).toEqual([done.id]);
  });

  it('returns 404 for an unknown campaign and 400 for a malformed id', async () => {
    expect((await request(app).get('/api/campaigns/3f2b1d1e-0000-4000-8000-000000000000')).status).toBe(404);
    expect((await request(app).get('/api/campaigns/nope')).status).toBe(400);
  });
});

describe('POST /api/campaigns/:id/process', () => {
  it('promotes a delayed job instead of adding a duplicate', async () => {
    const campaign = await createCampaignFor([1, 2]);
    const job = { isDelayed: jest.fn().mockResolvedValue(true), promote: jest.fn() };
    queue.getJob.mockResolvedValue(job);

    const res = await request(app).post(`/api/campaigns/${campaign.id}/process`);

    expect(res.status).toBe(202);
    expect(job.promote).toHaveBeenCalledTimes(1);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('re-enqueues when the job is gone from Redis', async () => {
    const campaign = await createCampaignFor([1, 2]);
    queue.getJob.mockResolvedValue(undefined);

    await request(app).post(`/api/campaigns/${campaign.id}/process`).expect(202);

    expect(queue.add).toHaveBeenCalledWith('expand', { campaignId: campaign.id }, expect.objectContaining({ delay: 0 }));
  });

  it('refuses to process a finished campaign', async () => {
    const campaign = await createCampaignFor([1]);
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'COMPLETED' } });
    await request(app).post(`/api/campaigns/${campaign.id}/process`).expect(409);
  });
});

describe('GET /api/campaigns/:id/progress', () => {
  it('derives counts from notification rows; unmaterialised recipients count as pending', async () => {
    const campaign = await createCampaignFor([1, 2, 3, 4, 5]);
    await prisma.notification.createMany({
      data: (['SENT', 'SENT', 'FAILED', 'PROCESSING'] as const).map((status, i) => ({
        campaignId: campaign.id,
        userId: i + 1,
        channel: 'EMAIL' as const,
        message: 'Hello from the test suite',
        status,
      })),
    });

    const res = await request(app).get(`/api/campaigns/${campaign.id}/progress`);

    expect(res.body).toEqual({
      status: 'PENDING',
      totalRecipients: 5,
      completedCount: 2,
      failedCount: 1,
      processing: 1,
      pending: 1,
    });
  });
});

describe('GET /api/users and /health', () => {
  it('paginates and searches users', async () => {
    const res = await request(app).get('/api/users?limit=4&page=3');
    expect(res.body).toMatchObject({ total: 10, totalPages: 3 });
    expect(res.body.items).toHaveLength(2);
    expect((await request(app).get('/api/users?search=u7@')).body.total).toBe(1);
  });

  it('reports dependency health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', checks: { api: 'up', postgres: 'up', redis: 'up', worker: 'up' } });
  });
});
