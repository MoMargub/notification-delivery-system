import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { HttpError } from '../../middleware/errorHandler';
import { channelSchema } from '../campaigns/campaigns.schemas';

const encodeCursor = (createdAt: Date, id: number) =>
  Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url');

const cursorSchema = z.string().transform((raw, ctx) => {
  const [iso = '', id = ''] = Buffer.from(raw, 'base64url').toString().split('|');
  const parsed = z.object({ iso: z.iso.datetime(), id: z.coerce.number().int() }).safeParse({ iso, id });
  if (!parsed.success) {
    ctx.addIssue({ code: 'custom', message: 'Invalid cursor' });
    return z.NEVER;
  }
  return parsed.data;
});

const listSchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
  campaignId: z.uuid().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'SENT', 'FAILED']).optional(),
  channel: channelSchema.optional(),
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const notificationsRouter = Router();

/**
 * Keyset pagination on (createdAt, id) DESC. With userId set this is a single range scan of
 * the (userId, createdAt DESC, id DESC) index, so page N costs the same as page 1.
 */
notificationsRouter.get('/', async (req, res) => {
  const { userId, campaignId, status, channel, cursor, limit } = listSchema.parse(req.query);

  const conditions = [Prisma.sql`n."isVisible" = true`];
  if (userId) conditions.push(Prisma.sql`n."userId" = ${userId}`);
  if (campaignId) conditions.push(Prisma.sql`n."campaignId" = ${campaignId}`);
  if (status) conditions.push(Prisma.sql`n.status = ${status}::"NotificationStatus"`);
  if (channel) conditions.push(Prisma.sql`n.channel = ${channel}::"Channel"`);
  if (cursor) {
    conditions.push(Prisma.sql`(n."createdAt", n.id) < (${cursor.iso}::timestamp(3), ${cursor.id}::int)`);
  }

  const rows = await prisma.$queryRaw<Array<{ id: number; createdAt: Date }>>`
    SELECT n.id, n."campaignId", c.title AS "campaignTitle", n."userId", u.name AS "userName",
           u.email AS "userEmail", n.channel, n.message, n.status, n."retryCount", n."lastError",
           n."isVisible", n."createdAt", n."processedAt"
    FROM notifications n
    JOIN users u ON u.id = n."userId"
    JOIN campaigns c ON c.id = n."campaignId"
    WHERE ${Prisma.join(conditions, ' AND ')}
    ORDER BY n."createdAt" DESC, n.id DESC
    LIMIT ${limit + 1}`;

  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  res.json({ items, nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null });
});

notificationsRouter.patch('/:id/hide', async (req, res) => {
  const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
  const { count } = await prisma.notification.updateMany({ where: { id }, data: { isVisible: false } });
  if (!count) throw new HttpError(404, 'Notification not found');
  res.json({ id, isVisible: false });
});
