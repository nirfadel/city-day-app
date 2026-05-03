import { Request, Response } from 'express';
import { Settings } from '../models';
import { ok } from '../middleware/auth.middleware';

const FILTER = { _id: { $exists: true } };

export const getSettings = async (_req: Request, res: Response) => {
  const settings = await Settings.findOneAndUpdate(
    FILTER,
    { $setOnInsert: { scoringEnabled: false } },
    { new: true, upsert: true }
  );
  ok(res, settings);
};

export const updateSettings = async (req: Request, res: Response) => {
  const { scoringEnabled } = req.body;
  const settings = await Settings.findOneAndUpdate(
    FILTER,
    { $set: { scoringEnabled: !!scoringEnabled } },
    { new: true, upsert: true }
  );
  ok(res, settings, 'Settings updated');
};
