import mongoose, { Document, Schema } from 'mongoose';

export interface IRoom extends Document {
  name: string;
  description?: string;
  isPrivate: boolean;
  password?: string;
  members: mongoose.Types.ObjectId[];
  admins: mongoose.Types.ObjectId[];
  owner: mongoose.Types.ObjectId;
  maxMembers: number;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    maxlength: 200
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    default: null
  },
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  admins: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  maxMembers: {
    type: Number,
    default: 100
  }
}, {
  timestamps: true
});

export const Room = mongoose.model<IRoom>('Room', roomSchema);