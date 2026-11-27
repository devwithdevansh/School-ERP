import mongoose from 'mongoose';

const lastLocationSchema = new mongoose.Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
    updatedAt: { type: Date },
  },
  { _id: false }
);

const tripRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      },
    },
    tripType: {
      type: String,
      enum: ['morning', 'evening'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'arrived', 'delayed', 'cancelled'],
      default: 'active',
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    lastLocation: {
      type: lastLocationSchema,
      default: null,
    },
    expectedArrivalTime: {
      type: Date,
      default: null,
    },
    parentAlertSent: {
      type: Boolean,
      default: false,
    },
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

tripRecordSchema.index({ studentId: 1, date: -1 });
tripRecordSchema.index({ status: 1, date: -1 });

const TripRecord = mongoose.model('TripRecord', tripRecordSchema);

export default TripRecord;
