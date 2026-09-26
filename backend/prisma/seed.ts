import { PrismaClient } from '@prisma/client';
import { env } from '../src/config/env';

const prisma = new PrismaClient();

// One set-based INSERT ... SELECT generate_series(): no per-row round trips, safe to re-run.
async function main() {
  const count = env.SEED_USER_COUNT;
  const inserted = await prisma.$executeRaw`
    INSERT INTO users (name, email)
    SELECT
      (ARRAY['Aarav','Priya','Liam','Emma','Noah','Sofia','Kenji','Elena','Marcus','Sarah'])[1 + g % 10]
        || ' ' ||
      (ARRAY['Sharma','Chen','Miller','Rostova','Sato','Vance','Patel','Garcia','Novak','Okafor'])[1 + (g / 10) % 10],
      'user' || g || '@example.com'
    FROM generate_series(1, ${count}) AS g
    ON CONFLICT (email) DO NOTHING`;
  console.log(`Seeded ${inserted} new users (target ${count}).`);
}

main().finally(() => prisma.$disconnect());
