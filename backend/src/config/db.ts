import { Prisma, PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Timestamps are stored as UTC `timestamp` columns; a bare now() would follow the session time zone.
export const NOW_UTC = Prisma.sql`(now() AT TIME ZONE 'UTC')`;
