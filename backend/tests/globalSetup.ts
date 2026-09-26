import { migrate } from '../scripts/migrate';

export default async function globalSetup() {
  await migrate(process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:1234@localhost:5432/notifications?schema=test');
}
