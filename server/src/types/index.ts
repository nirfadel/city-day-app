// ============================================================
// SHARED TYPES - used by both server models and client
// ============================================================

export type UserRole = 'admin' | 'player';
export type MissionType = 'text' | 'photo' | 'location';
export type MissionDelivery = 'envelope' | 'digital';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type MessageType = 'welcome' | 'hint' | 'mission_unlock' | 'feedback' | 'broadcast';

export interface IGroup {
  _id: string;
  name: string;
  color: string;       // hex color
  emoji: string;
  memberCount?: number;
  createdAt: Date;
}

export interface IUser {
  _id: string;
  nickname: string;
  groupId: string | IGroup;
  role: UserRole;
  sessionToken: string;
  joinedAt: Date;
}

export interface IHint {
  order: number;
  text?: string;
  imageUrl?: string;
}

export interface IMission {
  _id: string;
  order: number;
  title: string;
  type: MissionType;
  delivery: MissionDelivery;
  content: string;
  mediaUrl?: string;
  hints: IHint[];
  isActive: boolean;
  unlockedAt?: Date;
  unlockedForGroups?: string[];
  createdAt: Date;
  autoHintOnApproval?: string;
  autoHintTitle?: string;
  hintMode?: 'auto' | 'manual' | 'none';
}

export interface ISubmission {
  _id: string;
  missionId: string | IMission;
  groupId: string | IGroup;
  submittedBy: string;      // nickname
  answerText?: string;
  answerImageUrl?: string;
  answerImageUrls?: string[];
  status: SubmissionStatus;
  adminFeedback?: string;
  score?: number;
  submittedAt: Date;
  reviewedAt?: Date;
}

export interface IMessage {
  _id: string;
  groupId?: string | IGroup; // null = broadcast to all
  type: MessageType;
  title?: string;
  content: string;
  mediaUrl?: string;
  isRead: boolean;
  createdAt: Date;
}

// ============================================================
// SOCKET EVENTS
// ============================================================
export const SOCKET_EVENTS = {
  // Server → Client
  USER_JOINED:          'user:joined',
  MISSION_UNLOCKED:     'mission:unlocked',
  SUBMISSION_RECEIVED:  'submission:received',
  SUBMISSION_REVIEWED:  'submission:reviewed',
  MESSAGE_NEW:          'message:new',
  HINT_UNLOCKED:        'hint:unlocked',
  GAME_COMPLETED:       'game:completed',

  // Client → Server
  JOIN_ROOM:            'join:room',
  ADMIN_JOIN:           'admin:join',
} as const;

// ============================================================
// API RESPONSE WRAPPER
// ============================================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
