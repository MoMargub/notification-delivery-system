// Stand-in for src/queue so tests need PostgreSQL only (no Redis).
export const campaignQueue = { add: jest.fn(), getJob: jest.fn() };
export const notificationQueue = { addBulk: jest.fn(), getWorkers: jest.fn().mockResolvedValue([{}]) };
export const connection = { ping: jest.fn().mockResolvedValue('PONG') };

export const campaignJobOptions = (campaignId: string, delay = 0) => ({ jobId: `campaign-${campaignId}`, delay });
export const notificationJob = (notificationId: number) => ({
  name: 'send',
  data: { notificationId },
  opts: { jobId: `notification-${notificationId}` },
});
