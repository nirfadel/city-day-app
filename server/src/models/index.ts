import mongoose, { Schema, Document } from 'mongoose';

// ============================================================
// GROUP
// ============================================================
export interface GroupDoc extends Document {
  name: string;
  color: string;
  emoji: string;
  createdAt: Date;
}

const GroupSchema = new Schema<GroupDoc>({
  name:  { type: String, required: true, unique: true, trim: true },
  color: { type: String, required: true, default: '#3498db' },
  emoji: { type: String, default: '🏆' },
}, { timestamps: true });

export const Group = mongoose.model<GroupDoc>('Group', GroupSchema);


// ============================================================
// USER
// ============================================================
export interface UserDoc extends Document {
  nickname: string;
  groupId: mongoose.Types.ObjectId;
  role: 'admin' | 'player';
  sessionToken: string;
  joinedAt: Date;
}

const UserSchema = new Schema<UserDoc>({
  nickname:     { type: String, required: true, trim: true },
  groupId:      { type: Schema.Types.ObjectId, ref: 'Group' },
  role:         { type: String, enum: ['admin', 'player'], default: 'player' },
  sessionToken: { type: String, required: true },
  joinedAt:     { type: Date, default: Date.now },
});

UserSchema.index({ sessionToken: 1 });

export const User = mongoose.model<UserDoc>('User', UserSchema);


// ============================================================
// MISSION
// ============================================================
export interface HintDoc {
  order: number;
  text?: string;
  imageUrl?: string;
}

export interface MissionDoc extends Document {
  order: number;
  title: string;
  type: 'text' | 'photo' | 'location';
  delivery: 'envelope' | 'digital';
  content: string;
  mediaUrl?: string;
  hints: HintDoc[];
  isActive: boolean;          // true = unlocked globally (mission 1 at game start)
  unlockedAt?: Date;
  unlockedForGroups: mongoose.Types.ObjectId[];  // per-group unlock
  autoHintOnApproval?: string;
  autoHintTitle?: string;
}

const HintSchema = new Schema<HintDoc>({
  order:    { type: Number, required: true },
  text:     { type: String },
  imageUrl: { type: String },
}, { _id: false });

const MissionSchema = new Schema<MissionDoc>({
  order:               { type: Number, required: true, unique: true },
  title:               { type: String, required: true },
  type:                { type: String, enum: ['text', 'photo', 'location'], default: 'text' },
  delivery:            { type: String, enum: ['envelope', 'digital'], default: 'digital' },
  content:             { type: String, required: true },
  mediaUrl:            { type: String },
  hints:               [HintSchema],
  isActive:            { type: Boolean, default: false },
  unlockedAt:          { type: Date },
  unlockedForGroups:   [{ type: Schema.Types.ObjectId, ref: 'Group' }],
  autoHintOnApproval:  { type: String },
  autoHintTitle:       { type: String },
}, { timestamps: true });

export const Mission = mongoose.model<MissionDoc>('Mission', MissionSchema);


// ============================================================
// SUBMISSION
// ============================================================
export interface SubmissionDoc extends Document {
  missionId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  submittedBy: string;
  answerText?: string;
  answerImageUrl?: string;
  answerImageUrls?: string[];
  status: 'pending' | 'approved' | 'rejected';
  adminFeedback?: string;
  score?: number;
  submittedAt: Date;
  reviewedAt?: Date;
}

const SubmissionSchema = new Schema<SubmissionDoc>({
  missionId:      { type: Schema.Types.ObjectId, ref: 'Mission', required: true },
  groupId:        { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  submittedBy:    { type: String, required: true },
  answerText:      { type: String },
  answerImageUrl:  { type: String },
  answerImageUrls: { type: [String] },
  status:         { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminFeedback:  { type: String },
  score:          { type: Number },
  submittedAt:    { type: Date, default: Date.now },
  reviewedAt:     { type: Date },
});

// One submission per group per mission
SubmissionSchema.index({ missionId: 1, groupId: 1 });

export const Submission = mongoose.model<SubmissionDoc>('Submission', SubmissionSchema);


// ============================================================
// MESSAGE
// ============================================================
export interface MessageDoc extends Document {
  groupId?: mongoose.Types.ObjectId;  // null = broadcast
  type: 'welcome' | 'hint' | 'mission_unlock' | 'feedback' | 'broadcast';
  title?: string;
  content: string;
  mediaUrl?: string;
  isRead: boolean;
  createdAt: Date;
}

const MessageSchema = new Schema<MessageDoc>({
  groupId:  { type: Schema.Types.ObjectId, ref: 'Group', default: null },
  type:     { type: String, enum: ['welcome', 'hint', 'mission_unlock', 'feedback', 'broadcast'], required: true },
  title:    { type: String },
  content:  { type: String, required: true },
  mediaUrl: { type: String },
  isRead:   { type: Boolean, default: false },
}, { timestamps: true });

MessageSchema.index({ groupId: 1, createdAt: -1 });

export const Message = mongoose.model<MessageDoc>('Message', MessageSchema);


// ============================================================
// SETTINGS  (singleton — always _id: 'global')
// ============================================================
export interface SettingsDoc extends Document {
  scoringEnabled: boolean;
}

const SettingsSchema = new Schema<SettingsDoc>({
  scoringEnabled: { type: Boolean, default: false },
}, { versionKey: false });

export const Settings = mongoose.model<SettingsDoc>('Settings', SettingsSchema);
