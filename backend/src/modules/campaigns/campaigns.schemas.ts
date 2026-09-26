import { z } from 'zod';

export const channelSchema = z.enum(['EMAIL', 'PUSH']);
export const campaignStatusSchema = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']);

export const MAX_SELECTED_USERS = 10_000;

export const createCampaignSchema = z.object({
  title: z.string().trim().min(3).max(100),
  message: z.string().trim().min(10).max(1000),
  channel: channelSchema,
  scheduledAt: z.iso.datetime({ offset: true }),
  // Omitted = every user. Explicit selection is capped; larger audiences use "all users".
  userIds: z.array(z.number().int().positive()).min(1).max(MAX_SELECTED_USERS).optional(),
});

export const listCampaignsSchema = z.object({
  status: campaignStatusSchema.optional(),
  channel: channelSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const idParamSchema = z.object({ id: z.uuid() });

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type ListCampaignsQuery = z.infer<typeof listCampaignsSchema>;
