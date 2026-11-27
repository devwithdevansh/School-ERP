import mongoose from 'mongoose';

const homeAddressSchema = new mongoose.Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
    label: { type: String },
  },
  { _id: false }
);

const safeReachConsentSchema = new mongoose.Schema(
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
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Parent',
      required: true,
    },
    consentGiven: {
      type: Boolean,
      default: false,
    },
    consentUpdatedAt: {
      type: Date,
      default: null,
    },
    homeRadiusMeters: {
      type: Number,
      default: 200,
      min: 50,
      max: 2000,
    },
    homeAddress: {
      type: homeAddressSchema,
      default: null,
    },
    notifyDelayAfterMinutes: {
      type: Number,
      default: 30,
    },
  },
  { timestamps: true }
);

safeReachConsentSchema.index({ studentId: 1, academicYearId: 1 }, { unique: true });

const SafeReachConsent = mongoose.model('SafeReachConsent', safeReachConsentSchema);

export default SafeReachConsent;
