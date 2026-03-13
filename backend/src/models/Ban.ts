import mongoose, { Document, Schema } from 'mongoose';

export interface IBan extends Document {
  user: mongoose.Types.ObjectId;
  room?: mongoose.Types.ObjectId; // null = global ban
  bannedBy: mongoose.Types.ObjectId;
  reason?: string;
  expiresAt?: Date;
  isActive: boolean;
  scope: 'room' | 'global'; // room = one chat, global = all chats + DMs
  createdAt: Date;
  updatedAt: Date;
}

const banSchema = new Schema<IBan>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    default: null // null for global bans
  },
  scope: {
    type: String,
    enum: ['room', 'global'],
    default: 'room'
  },
  bannedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    maxlength: 500
  },
  expiresAt: {
    type: Date,
    default: null // null = permanent ban
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
banSchema.index({ user: 1, room: 1, isActive: 1 });
banSchema.index({ expiresAt: 1 });

export const Ban = mongoose.model<IBan>('Ban', banSchema);