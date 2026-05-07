import { Request, Response } from 'express';
import { Mission } from '../models';
import { ok, created, fail } from '../middleware/auth.middleware';
import { fileUrl } from '../middleware/upload.middleware';
import { getIO } from '../socket/socket.handler';
import { SOCKET_EVENTS } from '../types';

// GET /api/missions
export const getMissions = async (req: Request, res: Response) => {
  if (req.isAdmin) {
    const missions = await Mission.find().sort({ order: 1 });
    return ok(res, missions);
  }
  // Player: missions unlocked globally (isActive) OR unlocked for their group
  const groupId = (req.user?.groupId as any)?._id || req.user?.groupId;
  const missions = await Mission.find({
    $or: [{ isActive: true }, { unlockedForGroups: groupId }],
  }).sort({ order: 1 });
  ok(res, missions);
};

// GET /api/missions/:id
export const getMission = async (req: Request, res: Response) => {
  const mission = await Mission.findById(req.params.id);
  if (!mission) return fail(res, 'Mission not found', 404);
  ok(res, mission);
};

// POST /api/missions  [admin]
export const createMission = async (req: Request, res: Response) => {
  const { order, title, type, delivery, content, hints, autoHintTitle } = req.body;
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;

  const mediaUrl             = files?.media?.[0] ? fileUrl(req, files.media[0].filename) : undefined;
  const autoHintOnApproval   = files?.hint?.[0]  ? fileUrl(req, files.hint[0].filename)  : undefined;

  const mission = await Mission.create({
    order: Number(order),
    title,
    type,
    delivery: delivery ?? 'digital',
    content,
    mediaUrl,
    hints: hints ? JSON.parse(hints) : [],
    autoHintOnApproval,
    autoHintTitle: autoHintTitle ?? '',
  });

  created(res, mission);
};

// PUT /api/missions/:id  [admin]
export const updateMission = async (req: Request, res: Response) => {
  const { order, title, type, delivery, content, autoHintTitle } = req.body;
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;

  const update: Record<string, unknown> = {
    ...(order         !== undefined && { order: Number(order) }),
    ...(title         !== undefined && { title }),
    ...(type          !== undefined && { type }),
    ...(delivery      !== undefined && { delivery }),
    ...(content       !== undefined && { content }),
    ...(autoHintTitle !== undefined && { autoHintTitle }),
  };

  if (files?.media?.[0]) update.mediaUrl           = fileUrl(req, files.media[0].filename);
  if (files?.hint?.[0])  update.autoHintOnApproval = fileUrl(req, files.hint[0].filename);

  const mission = await Mission.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!mission) return fail(res, 'Mission not found', 404);
  ok(res, mission);
};

// POST /api/missions/:id/unlock  [admin]
// Broadcasts mission to all connected clients
export const unlockMission = async (req: Request, res: Response) => {
  const mission = await Mission.findByIdAndUpdate(
    req.params.id,
    { isActive: true, unlockedAt: new Date() },
    { new: true }
  );
  if (!mission) return fail(res, 'Mission not found', 404);

  // Broadcast to all players
  getIO().emit(SOCKET_EVENTS.MISSION_UNLOCKED, mission);

  ok(res, mission, `Mission "${mission.title}" unlocked`);
};

// POST /api/missions/:id/hint/:hintOrder/unlock  [admin]
export const unlockHint = async (req: Request, res: Response) => {
  const { id, hintOrder } = req.params;
  const mission = await Mission.findById(id);
  if (!mission) return fail(res, 'Mission not found', 404);

  const hint = mission.hints.find(h => h.order === Number(hintOrder));
  if (!hint) return fail(res, 'Hint not found', 404);

  // Emit to specific group or all
  const { groupId } = req.body;
  const room = groupId ? `group-${groupId}` : undefined;

  if (room) getIO().to(room).emit(SOCKET_EVENTS.HINT_UNLOCKED, { missionId: id, hint });
  else      getIO().emit(SOCKET_EVENTS.HINT_UNLOCKED, { missionId: id, hint });

  ok(res, hint, 'Hint unlocked');
};

// DELETE /api/missions/:id/hint  [admin] — removes autoHintOnApproval
export const removeAutoHint = async (req: Request, res: Response) => {
  const mission = await Mission.findByIdAndUpdate(
    req.params.id,
    { $unset: { autoHintOnApproval: '', autoHintTitle: '' } },
    { new: true }
  );
  if (!mission) return fail(res, 'Mission not found', 404);
  ok(res, mission, 'Auto-hint removed');
};

// DELETE /api/missions/:id  [admin]
export const deleteMission = async (req: Request, res: Response) => {
  await Mission.findByIdAndDelete(req.params.id);
  ok(res, null, 'Mission deleted');
};

// PUT /api/missions/reorder  [admin]
// Body: [{ id, order }, ...]
export const reorderMissions = async (req: Request, res: Response) => {
  const items: { id: string; order: number }[] = req.body;
  if (!Array.isArray(items)) return fail(res, 'Expected array of {id, order}');

  await Promise.all(
    items.map(({ id, order }) => Mission.findByIdAndUpdate(id, { order }))
  );
  const missions = await Mission.find().sort({ order: 1 });
  ok(res, missions, 'Order updated');
};
