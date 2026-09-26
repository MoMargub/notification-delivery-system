import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

/**
 * Applies the SQL migration file with plain SQL (no Prisma CLI).
 * Creates the database if missing; does nothing when the tables already exist.
 */
async function ensureDatabase(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const name = decodeURIComponent(url.pathname.slice(1));
  url.pathname = '/postgres';
  const admin = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    const found = await admin.$queryRawUnsafe<unknown[]>('SELECT 1 FROM pg_database WHERE datname = $1', name);
    if (found.length === 0) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
      console.log(`Created database "${name}".`);
    }
  } finally {
    await admin.$disconnect();
  }
}

export async function migrate(databaseUrl = process.env.DATABASE_URL!) {
  await ensureDatabase(databaseUrl);
  const schema = new URL(databaseUrl).searchParams.get('schema') ?? 'public';
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    const [{ exists }] = await prisma.$queryRawUnsafe<[{ exists: boolean }]>(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'campaigns') AS exists`,
      schema,
    );
    if (exists) return console.log(`Schema "${schema}" already migrated.`);

    const sql = readFileSync(join(__dirname, '../prisma/migrations/20260925000000_init/migration.sql'), 'utf8');
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
      .filter(Boolean);
    await prisma.$transaction(statements.map((s) => prisma.$executeRawUnsafe(s)));
    console.log(`Applied ${statements.length} statements to schema "${schema}".`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) migrate().catch((e) => { console.error(e); process.exit(1); });
