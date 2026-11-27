import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema(
  {
    milestone: { type: String, required: true },
    targetDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'achieved'],
      default: 'pending',
    },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
);

const counselingRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['academic', 'behavioural', 'social', 'emotional'],
      required: true,
    },
    trigger: {
      source: {
        type: String,
        enum: [
          'exam_result',
          'attendance',
          'self_referral',
          'teacher_observation',
          'parent_request',
        ],
      },
      refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    privateNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    supportPlan: [milestoneSchema],
    visibility: {
      type: String,
      enum: ['admin_teacher_only', 'with_parent_consent'],
      default: 'admin_teacher_only',
    },
    parentConsentGiven: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'closed'],
      default: 'open',
    },
    closedAt: { type: Date, default: null },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

counselingRecordSchema.index({ studentId: 1, createdAt: -1 });
counselingRecordSchema.index({ createdBy: 1, status: 1 });

const CounselingRecord = mongoose.model('CounselingRecord', counselingRecordSchema);

export default CounselingRecord;
