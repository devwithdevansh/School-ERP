import mongoose from 'mongoose';

const masteryRecordSchema = new mongoose.Schema(
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
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
    },
    marksObtained: {
      type: Number,
      required: true,
      min: 0,
    },
    maxMarks: {
      type: Number,
      required: true,
      min: 1,
    },
    masteryPct: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

masteryRecordSchema.index({ studentId: 1, conceptTagId: 1, date: -1 });

const MasteryRecord = mongoose.model('MasteryRecord', masteryRecordSchema);
export default MasteryRecord;
