import mongoose from 'mongoose';

const conceptTagSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    chapterNumber: {
      type: Number,
      required: true,
    },
    chapterName: {
      type: String,
      required: true,
      trim: true,
    },
    conceptName: {
      type: String,
      required: true,
      trim: true,
    },
    sequence: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Unique within subject: same chapter+concept cannot repeat
conceptTagSchema.index(
  { subjectId: 1, chapterNumber: 1, conceptName: 1 },
  { unique: true }
);

const ConceptTag = mongoose.model('ConceptTag', conceptTagSchema);
export default ConceptTag;
