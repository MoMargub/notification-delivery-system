import { Channel, Notification } from '@prisma/client';

export interface NotificationProvider {
  send(notification: Notification): Promise<void>;
}

// Deterministic failures, so retry behaviour is reproducible:
//   userId % 50 === 0 -> always fails (ends FAILED after the last attempt)
//   userId % 10 === 0 -> fails the first two attempts, then succeeds
abstract class MockProvider implements NotificationProvider {
  abstract readonly name: string;

  async send({ userId, retryCount }: Notification): Promise<void> {
    if (userId % 50 === 0) throw new Error(`${this.name}: recipient permanently rejected`);
    if (userId % 10 === 0 && retryCount < 2) throw new Error(`${this.name}: temporary provider error`);
  }
}

export class MockEmailProvider extends MockProvider {
  readonly name = 'MockEmail';
}

export class MockPushProvider extends MockProvider {
  readonly name = 'MockPush';
}

export const providers: Record<Channel, NotificationProvider> = {
  EMAIL: new MockEmailProvider(),
  PUSH: new MockPushProvider(),
};
