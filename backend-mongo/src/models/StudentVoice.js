import mongoose from 'mongoose';

const threadEntrySchema = new mongoose.Schema(
  {
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    byRole: {
      type: String,
      enum: ['student', 'parent', 'STAFF', 'TEACHER', 'ADMIN'],
      required: true,
    },
    message: { type: String, required: true, trim: true },
    ts: { type: Date, default: Date.now },
  },
  { _id: false }
);

const studentVoiceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: ['safety', 'academic', 'wellbeing', 'facility', 'other'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'action_taken', 'resolved'],
      default: 'submitted',
    },
    thread: [threadEntrySchema],
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

studentVoiceSchema.index({ submittedBy: 1, createdAt: -1 });
studentVoiceSchema.index({ status: 1, assignedTo: 1 });
studentVoiceSchema.index({ category: 1, status: 1 });

const StudentVoice = mongoose.model('StudentVoice', studentVoiceSchema);
export default StudentVoice;
