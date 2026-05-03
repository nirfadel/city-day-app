import { Request, Response } from 'express';
import { Message } from '../models';
import { ok, created, fail } from '../middleware/auth.middleware';
import { fileUrl } from '../middleware/upload.middleware';
import { getIO } from '../socket/socket.handler';
import { SOCKET_EVENTS } from '../types';

// GET /api/messages  (player gets their messages + broadcasts)
export const getMessages = async (req: Request, res: Response) => {
  const groupId = (req.user?.groupId as any)?._id || req.user?.groupId;

  const messages = await Message.find({
    $or: [{ groupId }, { groupId: null }],
  }).sort({ createdAt: -1 });

  ok(res, messages);
};

// GET /api/messages/all  [admin]
export const getAllMessages = async (_req: Request, res: Response) => {
  const messages = await Message.find()
    .populate('groupId', 'name color')
    .sort({ createdAt: -1 });
  ok(res, messages);
};

// POST /api/messages  [admin] - send message to group or broadcast
export const sendMessage = async (req: Request, res: Response) => {
  const { groupId, type, title, content } = req.body;
  if (!content?.trim()) return fail(res, 'Content is required');

  const mediaUrl = req.file ? fileUrl(req, req.file.filename) : undefined;

  const message = await Message.create({
    groupId: groupId || null,
    type: type || 'broadcast',
    title,
    content,
    mediaUrl,
  });

  // Emit via socket
  const event = SOCKET_EVENTS.MESSAGE_NEW;
  if (groupId) getIO().to(`group-${groupId}`).emit(event, message);
  else         getIO().emit(event, message);   // broadcast

  created(res, message);
};

// PUT /api/messages/welcome  [admin] - set the welcome message
export const setWelcomeMessage = async (req: Request, res: Response) => {
  const { content, groupId } = req.body;
  if (!content?.trim()) return fail(res, 'Content is required');

  // Upsert welcome message
  const message = await Message.findOneAndUpdate(
    { type: 'welcome', groupId: groupId || null },
    { content, type: 'welcome', groupId: groupId || null },
    { upsert: true, new: true }
  );

  ok(res, message, 'Welcome message updated');
};
