import { Router } from 'express';
import {
  createCampaign,
  findCampaign,
  getProgress,
  listCampaigns,
  processCampaign,
} from './campaigns.service';
import { createCampaignSchema, idParamSchema, listCampaignsSchema } from './campaigns.schemas';

export const campaignsRouter = Router();

campaignsRouter.post('/', async (req, res) => {
  const campaign = await createCampaign(createCampaignSchema.parse(req.body));
  res.status(202).json(campaign);
});

campaignsRouter.get('/', async (req, res) => {
  res.json(await listCampaigns(listCampaignsSchema.parse(req.query)));
});

campaignsRouter.get('/:id', async (req, res) => {
  res.json(await findCampaign(idParamSchema.parse(req.params).id));
});

campaignsRouter.get('/:id/progress', async (req, res) => {
  res.json(await getProgress(idParamSchema.parse(req.params).id));
});

campaignsRouter.post('/:id/process', async (req, res) => {
  res.status(202).json(await processCampaign(idParamSchema.parse(req.params).id));
});
