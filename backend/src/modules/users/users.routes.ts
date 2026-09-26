import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';

const querySchema = z.object({
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const usersRouter = Router();

usersRouter.get('/', async (req, res) => {
  const { search, page, limit } = querySchema.parse(req.query);
  const where: Prisma.UserWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { id: 'asc' }, skip: (page - 1) * limit, take: limit }),
    prisma.user.count({ where }),
  ]);
  res.json({ items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
});
