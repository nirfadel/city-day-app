import { Request, Response } from 'express';
import { Group, User } from '../models';
import { ok, created, fail } from '../middleware/auth.middleware';

// GET /api/groups
export const getGroups = async (_req: Request, res: Response) => {
  const groups = await Group.find().sort({ name: 1 });

  // Add member count to each group
  const withCount = await Promise.all(
    groups.map(async (g) => ({
      ...g.toObject(),
      memberCount: await User.countDocuments({ groupId: g._id, role: 'player' }),
    }))
  );

  ok(res, withCount);
};

// POST /api/groups  [admin]
export const createGroup = async (req: Request, res: Response) => {
  const { name, color, emoji } = req.body;
  if (!name?.trim()) return fail(res, 'Name is required');

  const group = await Group.create({ name: name.trim(), color, emoji });
  created(res, group);
};

// PUT /api/groups/:id  [admin]
export const updateGroup = async (req: Request, res: Response) => {
  const group = await Group.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!group) return fail(res, 'Group not found', 404);
  ok(res, group);
};

// DELETE /api/groups/:id  [admin]
export const deleteGroup = async (req: Request, res: Response) => {
  const members = await User.countDocuments({ groupId: req.params.id });
  if (members > 0) return fail(res, `Cannot delete: ${members} members in this group`);

  await Group.findByIdAndDelete(req.params.id);
  ok(res, null, 'Group deleted');
};

// GET /api/groups/:id/members  [admin]
export const getGroupMembers = async (req: Request, res: Response) => {
  const members = await User.find({ groupId: req.params.id, role: 'player' })
    .select('nickname joinedAt')
    .sort({ joinedAt: 1 });
  ok(res, members);
};

// GET /api/groups/members/all  [admin]
export const getAllMembers = async (_req: Request, res: Response) => {
  const members = await User.find({ role: 'player' })
    .populate<{ groupId: { name: string; color: string } }>('groupId', 'name color')
    .select('nickname joinedAt groupId')
    .sort({ joinedAt: -1 });

  const result = members.map(m => ({
    nickname:   m.nickname,
    groupName:  (m.groupId as any)?.name  ?? '',
    groupColor: (m.groupId as any)?.color ?? '',
    joinedAt:   m.joinedAt,
  }));

  ok(res, result);
};
