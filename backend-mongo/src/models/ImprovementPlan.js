import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    url: { type: String, trim: true },
    type: {
      type: String,
      enum: ['link', 'note', 'exercise'],
    },
  },
  { _id: false }
);

const improvementPlanSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    conceptTagId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ConceptTag',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1500,
    },
    resources: [resourceSchema],
    targetDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

improvementPlanSchema.index({ studentId: 1, conceptTagId: 1 });
improvementPlanSchema.index({ createdBy: 1, status: 1 });

const ImprovementPlan = mongoose.model('ImprovementPlan', improvementPlanSchema);
export default ImprovementPlan;
