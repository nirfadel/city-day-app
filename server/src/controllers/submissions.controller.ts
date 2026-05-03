import { Request, Response } from 'express';
import { Submission, Mission, Group, Message } from '../models';
import { ok, created, fail } from '../middleware/auth.middleware';
import { fileUrl } from '../middleware/upload.middleware';
import { getIO } from '../socket/socket.handler';
import { SOCKET_EVENTS } from '../types';

// POST /api/submissions  (player submits answer)
export const submitAnswer = async (req: Request, res: Response) => {
  const { missionId, answerText } = req.body;
  const groupId = (req.user?.groupId as any)?._id || req.user?.groupId;

  if (!missionId)              return fail(res, 'Mission ID required');
  if (!answerText && !req.file) return fail(res, 'Answer text or image required');

  const mission = await Mission.findById(missionId);
  if (!mission) return fail(res, 'Mission not found', 404);
  const groupUnlocked = mission.unlockedForGroups?.some(id => id.toString() === groupId?.toString());
  if (!mission.isActive && !groupUnlocked) return fail(res, 'Mission is not active');

  // Check for existing pending submission
  const existing = await Submission.findOne({ missionId, groupId, status: 'pending' });
  if (existing) return fail(res, 'Your group already has a pending submission for this mission');

  const answerImageUrl = req.file ? fileUrl(req, req.file.filename) : undefined;

  const submission = await Submission.create({
    missionId,
    groupId,
    submittedBy: req.user!.nickname,
    answerText,
    answerImageUrl,
    status: 'pending',
  });

  const populated = await submission.populate(['missionId', 'groupId']);

  // Notify admin
  getIO().to('admin-room').emit(SOCKET_EVENTS.SUBMISSION_RECEIVED, populated);

  created(res, submission);
};

// GET /api/submissions  [admin] - all submissions with filters
export const getSubmissions = async (req: Request, res: Response) => {
  const { status, groupId, missionId } = req.query;
  const filter: Record<string, unknown> = {};

  if (status)    filter.status = status;
  if (groupId)   filter.groupId = groupId;
  if (missionId) filter.missionId = missionId;

  const submissions = await Submission.find(filter)
    .populate('missionId', 'title order type')
    .populate('groupId', 'name color emoji')
    .sort({ submittedAt: -1 });

  ok(res, submissions);
};

// GET /api/submissions/my  (player gets their group's submissions)
export const getMySubmissions = async (req: Request, res: Response) => {
  const groupId = (req.user?.groupId as any)?._id || req.user?.groupId;

  const submissions = await Submission.find({ groupId })
    .populate('missionId', 'title order type')
    .sort({ submittedAt: -1 });

  ok(res, submissions);
};

// PUT /api/submissions/:id/review  [admin]
export const reviewSubmission = async (req: Request, res: Response) => {
  const { status, adminFeedback, score } = req.body;
  if (!['approved', 'rejected'].includes(status)) return fail(res, 'Status must be approved or rejected');

  const submission = await Submission.findByIdAndUpdate(
    req.params.id,
    { status, adminFeedback, score, reviewedAt: new Date() },
    { new: true }
  ).populate(['missionId', 'groupId']);

  if (!submission) return fail(res, 'Submission not found', 404);

  const groupId = (submission.groupId as any)?._id?.toString() || submission.groupId?.toString();
  const mission = submission.missionId as any;

  // Save feedback as message
  if (adminFeedback) {
    await Message.create({
      groupId,
      type: 'feedback',
      title: `פידבק: ${mission?.title}`,
      content: adminFeedback,
    });
  }

  if (status === 'approved') {
    // Auto-send hint for this mission (only to this group)
    if (mission?.autoHintOnApproval) {
      const hintMsg = await Message.create({
        groupId,
        type: 'hint',
        title: mission.autoHintTitle || 'רמז חדש!',
        content: 'הנה הרמז הבא שלכם 👇',
        mediaUrl: mission.autoHintOnApproval,
      });
      getIO().to(`group-${groupId}`).emit(SOCKET_EVENTS.MESSAGE_NEW, hintMsg);
    }

    // Unlock next mission only for this group — persist in DB + emit via socket
    const nextMission = await Mission.findOneAndUpdate(
      { order: mission.order + 1 },
      { $addToSet: { unlockedForGroups: groupId } },
      { new: true }
    );
    if (nextMission) {
      getIO().to(`group-${groupId}`).emit(SOCKET_EVENTS.MISSION_UNLOCKED, nextMission);
    } else {
      // No next mission — this group finished the game!
      const groupName = (submission.groupId as any)?.name ?? '';
      getIO().to(`group-${groupId}`).emit(SOCKET_EVENTS.GAME_COMPLETED, { groupName });
      getIO().to('admin-room').emit(SOCKET_EVENTS.GAME_COMPLETED, { groupId, groupName });
    }
  }

  // Notify group about review result
  const reviewedPayload = {
    submissionId: submission._id,
    missionId: submission.missionId,
    status,
    adminFeedback,
    score,
  };
  getIO().to(`group-${groupId}`).emit(SOCKET_EVENTS.SUBMISSION_REVIEWED, reviewedPayload);
  getIO().to('admin-room').emit(SOCKET_EVENTS.SUBMISSION_REVIEWED, reviewedPayload);

  ok(res, submission, `Submission ${status}`);
};

// GET /api/submissions/stats  [admin] - scoreboard
export const getStats = async (_req: Request, res: Response) => {
  const groups = await Group.find();

  const stats = await Promise.all(
    groups.map(async (g) => {
      const approved = await Submission.countDocuments({ groupId: g._id, status: 'approved' });
      const pending  = await Submission.countDocuments({ groupId: g._id, status: 'pending' });
      const totalScore = await Submission.aggregate([
        { $match: { groupId: g._id, status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$score' } } },
      ]);

      return {
        group: { _id: g._id, name: g.name, color: g.color, emoji: g.emoji },
        approved,
        pending,
        totalScore: totalScore[0]?.total ?? 0,
      };
    })
  );

  ok(res, stats);
};
