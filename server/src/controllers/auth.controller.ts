import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { User, Group, Message } from '../models';
import { ok, fail, signToken } from '../middleware/auth.middleware';
import { getIO } from '../socket/socket.handler';
import { SOCKET_EVENTS } from '../types';

// POST /api/auth/join
// Player joins the game: picks nickname + group
export const joinGame = async (req: Request, res: Response) => {
  const { nickname, groupId } = req.body;

  if (!nickname?.trim()) return fail(res, 'Nickname is required');
  if (!groupId)          return fail(res, 'Group is required');

  const group = await Group.findById(groupId);
  if (!group) return fail(res, 'Group not found');

  // Check nickname uniqueness within group
  const exists = await User.findOne({ nickname: nickname.trim(), groupId });
  if (exists) return fail(res, 'Nickname already taken in this group. Choose another.');

  const sessionToken = uuidv4();
  const user = await User.create({
    nickname: nickname.trim(),
    groupId,
    role: 'player',
    sessionToken,
  });

  const token = signToken({ userId: user._id, role: 'player' });

  // Fetch welcome message (broadcast or group-specific)
  const welcome = await Message.findOne({
    type: 'welcome',
    $or: [{ groupId }, { groupId: null }],
  }).sort({ createdAt: -1 });

  // Notify admin via socket
  getIO().to('admin-room').emit(SOCKET_EVENTS.USER_JOINED, {
    nickname: user.nickname,
    groupId,
    groupName: group.name,
    groupColor: group.color,
  });

  ok(res, {
    token,
    user: { _id: user._id, nickname: user.nickname, role: user.role, groupId, groupName: group.name, groupColor: group.color },
    welcomeMessage: welcome?.content ?? null,
  });
};

// POST /api/auth/admin-login
export const adminLogin = async (req: Request, res: Response) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) return fail(res, 'Wrong password', 401);

  // Get or create admin user
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = await User.create({
      nickname: 'Admin',
      role: 'admin',
      sessionToken: uuidv4(),
    });
  }

  const token = signToken({ userId: admin._id, role: 'admin' });
  ok(res, { token, user: { _id: admin._id, nickname: 'Admin', role: 'admin' } });
};

// GET /api/auth/me
export const getMe = async (req: Request, res: Response) => {
  ok(res, req.user);
};
