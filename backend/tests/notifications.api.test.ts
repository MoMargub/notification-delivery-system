import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';
import { createCampaignFor, createNotification, resetDb, seedUsers } from './helpers';

jest.mock('../src/queue', () => require('./queueMock'));

beforeEach(async () => {
  await resetDb();
  await seedUsers(3);
});
afterAll(() => prisma.$disconnect());

/** 7 notifications for user 1 (one per campaign); createdAt ties are deliberate to exercise the id tiebreaker. */
async function seedUserHistory() {
  const base = Date.parse('2026-01-01T00:00:00Z');
  const ids: number[] = [];
  for (let i = 0; i < 7; i++) {
    const campaign = await createCampaignFor([1]);
    const n = await createNotification(campaign.id, 1, { createdAt: new Date(base + Math.floor(i / 2) * 1000) });
    ids.push(n.id);
  }
  return ids;
}

describe('GET /api/notifications', () => {
  it('walks every page exactly once, newest first, with keyset cursors', async () => {
    const created = await seedUserHistory();
    const seen: number[] = [];
    let cursor: string | null = null;

    do {
      const res: request.Response = await request(app)
        .get('/api/notifications')
        .query({ userId: 1, limit: 3, ...(cursor && { cursor }) });
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeLessThanOrEqual(3);
      seen.push(...res.body.items.map((n: { id: number }) => n.id));
      cursor = res.body.nextCursor;
    } while (cursor);

    expect(seen).toEqual([...created].reverse());
  });

  it('returns user and campaign details and only the requested user', async () => {
    const campaign = await createCampaignFor([1, 2]);
    await createNotification(campaign.id, 1);
    await createNotification(campaign.id, 2);

    const res = await request(app).get('/api/notifications?userId=2');

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ userId: 2, userEmail: 'u2@test.dev', campaignTitle: 'Test campaign' });
    expect(res.body.nextCursor).toBeNull();
  });

  it('rejects bad cursors and oversized pages', async () => {
    await request(app).get('/api/notifications?cursor=garbage').expect(400);
    await request(app).get('/api/notifications?limit=1000').expect(400);
  });
});

describe('PATCH /api/notifications/:id/hide', () => {
  it('hides from listings without deleting delivery history', async () => {
    const campaign = await createCampaignFor([1]);
    const n = await createNotification(campaign.id, 1, { status: 'SENT' });
    await prisma.notificationAttempt.create({ data: { notificationId: n.id, attemptNumber: 1, status: 'SUCCESS' } });

    const res = await request(app).patch(`/api/notifications/${n.id}/hide`);

    expect(res.status).toBe(200);
    expect((await request(app).get('/api/notifications?userId=1')).body.items).toHaveLength(0);
    const row = await prisma.notification.findUniqueOrThrow({ where: { id: n.id }, include: { attempts: true } });
    expect(row).toMatchObject({ isVisible: false, status: 'SENT' });
    expect(row.attempts).toHaveLength(1);
  });

  it('returns 404 for an unknown notification', async () => {
    await request(app).patch('/api/notifications/999/hide').expect(404);
  });
});
