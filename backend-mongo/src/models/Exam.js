import mongoose from 'mongoose';

const examSchema = new mongoose.Schema(
  {
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
    },
    standard: {
      type: String,
      required: true,
    },
    // We can allow exams across a whole standard (all divisions) or specific divisions
    divisions: [{
      type: String,
      uppercase: true,
    }],
    medium: {
      type: String,
      required: true,
      enum: ['English', 'Gujarati'],
    },
    examName: {
      type: String, // e.g. "Mid Term", "Finals", "Weekly Test"
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['WEEKLY', 'FINAL'],
      default: 'FINAL',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SCHEDULED', 'MARKS_ENTRY', 'READY', 'PUBLISHED', 'LOCKED'],
      default: 'SCHEDULED',
    },
    allowTeacherPublish: {
      type: Boolean,
      default: false,
    },
    publishedAt: Date,
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    subjects: [{
      subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
      },
      examDate: Date,
      startTime: String,
      endTime: String,
      gradingSystem: {
        type: String,
        enum: ['Marks', 'Grades'],
        default: 'Marks',
      },
      maxMarks: {
        type: Number,
        default: 100, // Only applicable if gradingSystem is Marks
      },
      passingMarks: {
        type: Number,
        default: 35, // Only applicable if gradingSystem is Marks
      },
      entryStatus: {
        type: String,
        enum: ['PENDING', 'IN_PROGRESS', 'SUBMITTED'],
        default: 'PENDING',
      },
      submittedAt: Date,
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    }],
    isPublished: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

// Indexes
examSchema.index({ academicYearId: 1, standard: 1, medium: 1 });

const Exam = mongoose.model('Exam', examSchema);

export default Exam;
