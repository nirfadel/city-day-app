import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

// Controllers
import * as Auth        from '../controllers/auth.controller';
import * as Groups      from '../controllers/groups.controller';
import * as Missions    from '../controllers/missions.controller';
import * as Submissions from '../controllers/submissions.controller';
import * as Messages    from '../controllers/messages.controller';
import * as SettingsCtrl from '../controllers/settings.controller';

const router = Router();

// ============================================================
// AUTH
// ============================================================
router.post('/auth/join',        Auth.joinGame);
router.post('/auth/admin-login', Auth.adminLogin);
router.get ('/auth/me',          requireAuth, Auth.getMe);

// ============================================================
// GROUPS
// ============================================================
router.get   ('/groups',                             Groups.getGroups);
router.post  ('/groups',              requireAdmin, Groups.createGroup);
router.put   ('/groups/:id',          requireAdmin, Groups.updateGroup);
router.delete('/groups/:id',          requireAdmin, Groups.deleteGroup);
router.get   ('/groups/members/all',  requireAdmin, Groups.getAllMembers);
router.get   ('/groups/:id/members',  requireAdmin, Groups.getGroupMembers);

// ============================================================
// MISSIONS
// ============================================================
router.get   ('/missions',                            requireAuth,  Missions.getMissions);
router.get   ('/missions/:id',                        requireAuth,  Missions.getMission);
const missionUpload = upload.fields([{ name: 'media', maxCount: 1 }, { name: 'hint', maxCount: 1 }]);
const missionUploadMiddleware: import('express').RequestHandler = (req, res, next) =>
  missionUpload(req, res, (err) => {
    if (err) { console.error('[Upload error]', err.message); }
    next(); // continue even if a file was rejected — body fields are still parsed
  });
router.post  ('/missions',                            requireAdmin, missionUploadMiddleware, Missions.createMission);
router.put   ('/missions/reorder',                    requireAdmin, Missions.reorderMissions);
router.put   ('/missions/:id',                        requireAdmin, missionUploadMiddleware, Missions.updateMission);
router.delete('/missions/:id/hint',                   requireAdmin, Missions.removeAutoHint);
router.delete('/missions/:id',                        requireAdmin, Missions.deleteMission);
router.post  ('/missions/:id/unlock',                 requireAdmin, Missions.unlockMission);
router.post  ('/missions/:id/hint/:hintOrder/unlock', requireAdmin, Missions.unlockHint);

// ============================================================
// SUBMISSIONS
// ============================================================
router.post('/submissions',            requireAuth,  upload.array('images', 3), Submissions.submitAnswer);
router.get ('/submissions',            requireAdmin, Submissions.getSubmissions);
router.get ('/submissions/my',         requireAuth,  Submissions.getMySubmissions);
router.get ('/submissions/stats',      requireAdmin, Submissions.getStats);
router.put ('/submissions/:id/review', requireAdmin, Submissions.reviewSubmission);

// ============================================================
// GAME CONTROL (admin only)
// ============================================================
router.post('/admin/start', requireAdmin, async (_req, res) => {
  const { Mission } = await import('../models');
  const { getIO }   = await import('../socket/socket.handler');
  const { ok, fail } = await import('../middleware/auth.middleware');
  const { SOCKET_EVENTS } = await import('../types');

  const first = await Mission.findOneAndUpdate(
    { order: 1 },
    { isActive: true, unlockedAt: new Date() },
    { new: true }
  );
  if (!first) return fail(res, 'No mission with order 1 found');

  getIO().emit(SOCKET_EVENTS.MISSION_UNLOCKED, first);
  ok(res, first, `Mission "${first.title}" unlocked — game started!`);
});

// ============================================================
// RESET (admin only)
// ============================================================
router.post('/admin/reset', requireAdmin, async (_req, res) => {
  const { User, Submission, Message } = await import('../models');
  const { ok } = await import('../middleware/auth.middleware');
  const { Mission } = await import('../models');
  await Promise.all([
    User.deleteMany({ role: 'player' }),
    Submission.deleteMany({}),
    Message.deleteMany({ type: { $ne: 'welcome' } }),
    Mission.updateMany({}, { $set: { unlockedForGroups: [], isActive: false, unlockedAt: undefined } }),
  ]);
  ok(res, null, 'Game reset: players, submissions and messages cleared');
});

// ============================================================
// SETTINGS
// ============================================================
router.get('/settings', requireAdmin, SettingsCtrl.getSettings);
router.put('/settings', requireAdmin, SettingsCtrl.updateSettings);

// ============================================================
// MESSAGES
// ============================================================
router.get ('/messages',          requireAuth,  Messages.getMessages);
router.get ('/messages/all',      requireAdmin, Messages.getAllMessages);
router.post('/messages',          requireAdmin, upload.single('media'), Messages.sendMessage);
router.put ('/messages/welcome',  requireAdmin, Messages.setWelcomeMessage);

export default router;
