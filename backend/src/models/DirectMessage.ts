import mongoose, { Document, Schema } from 'mongoose';

export interface IDirectMessage extends Document {
  content: string;
  sender: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  messageType: 'text' | 'file' | 'image';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;
  isRead: boolean;
  readAt?: Date;
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  replyTo?: mongoose.Types.ObjectId;
  reactions: Array<{
    user: mongoose.Types.ObjectId;
    emoji: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const directMessageSchema = new Schema<IDirectMessage>({
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'image'],
    default: 'text'
  },
  fileUrl: {
    type: String,
    default: null
  },
  fileName: {
    type: String,
    default: null
  },
  fileSize: {
    type: Number,
    default: null
  },
  thumbnailUrl: {
    type: String,
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'DirectMessage',
    default: null
  },
  reactions: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
directMessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
directMessageSchema.index({ recipient: 1, isRead: 1 });

export const DirectMessage = mongoose.model<IDirectMessage>('DirectMessage', directMessageSchema);