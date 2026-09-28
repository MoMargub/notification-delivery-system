import { Channel, Notification } from '@prisma/client';

export interface NotificationProvider {
  send(notification: Notification): Promise<void>;
}

// Randomized failures, so retry behaviour is realistic and varies:
//   ~2% chance to fail permanently
//   ~10% chance to fail temporarily (succeeds on later attempts)
abstract class MockProvider implements NotificationProvider {
  abstract readonly name: string;

  async send({ retryCount }: Notification): Promise<void> {
    const rand = Math.random();
    
    // 2% permanent failure rate
    if (rand < 0.02) throw new Error(`${this.name}: recipient permanently rejected`);
    
    // 10% temporary failure rate (only fails if it's the first or second attempt)
    if (rand < 0.12 && retryCount < 2) throw new Error(`${this.name}: temporary provider error`);
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
