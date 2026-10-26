import mongoose from 'mongoose';

const documentRecordSchema = new mongoose.Schema(
  {
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: false,
      index: true,
    },
    academicYear: {
      type: String,
      default: '',
      index: true,
    },
    documentType: {
      type: String,
      enum: [
        'EVENT_CERTIFICATE',
        'BONAFIDE',
        'LEAVING_CERTIFICATE',
        'CHARACTER_CERTIFICATE',
        'APPRECIATION',
        'MERIT',
        'CUSTOM',
        'ID_CARD_BATCH',
      ],
      required: true,
      default: 'EVENT_CERTIFICATE',
      index: true,
    },
    certificateNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Document or certificate title is required'],
      trim: true,
      maxlength: 200,
    },
    recipientType: {
      type: String,
      enum: ['STUDENT', 'STAFF'],
      default: 'STUDENT',
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: false,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    standard: {
      type: String,
      trim: true,
      default: '',
    },
    division: {
      type: String,
      trim: true,
      default: '',
    },
    grNo: {
      type: String,
      trim: true,
      default: '',
    },
    rollNo: {
      type: Number,
      default: null,
    },
    eventName: {
      type: String,
      trim: true,
      default: '',
    },
    eventDate: {
      type: Date,
      default: null,
    },
    achievement: {
      type: String,
      trim: true,
      default: '',
    },
    bodyText: {
      type: String,
      trim: true,
      default: '',
    },
    templateId: {
      type: String,
      default: 'classic-gold',
    },
    issuedDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    signatory1: {
      name: { type: String, default: 'Principal' },
      title: { type: String, default: 'Head of Institution' },
    },
    signatory2: {
      name: { type: String, default: 'Event Coordinator' },
      title: { type: String, default: 'Coordinator' },
    },
    status: {
      type: String,
      enum: ['ISSUED', 'REVOKED'],
      default: 'ISSUED',
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

documentRecordSchema.index({ certificateNumber: 1, studentId: 1 });
documentRecordSchema.index({ documentType: 1, standard: 1, division: 1 });

export default mongoose.model('DocumentRecord', documentRecordSchema);
