import mongoose from 'mongoose';

const calendarEventSchema = new mongoose.Schema(
  {
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: [true, 'Academic year is required'],
      index: true,
    },
    academicYear: {
      type: String, // e.g. "2026-2027" for denormalized fast query
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Event or holiday title is required'],
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['HOLIDAY', 'EVENT', 'EXAM', 'ACADEMIC_MILESTONE', 'PTM', 'VACATION'],
      required: true,
      default: 'HOLIDAY',
      index: true,
    },
    category: {
      type: String,
      enum: [
        'NATIONAL_HOLIDAY',
        'FESTIVAL',
        'REGIONAL_FESTIVAL',
        'SCHOOL_HOLIDAY',
        'VACATION',
        'SPORTS',
        'CULTURAL',
        'ACADEMIC_EXAM',
        'PTM',
        'OTHER',
      ],
      default: 'SCHOOL_HOLIDAY',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      index: true,
    },
    isSchoolClosed: {
      type: Boolean,
      default: true, // Used by Attendance: disables marking or alerts teacher
    },
    isAllDay: {
      type: Boolean,
      default: true,
    },
    color: {
      type: String,
      default: '#10B981', // Tailwind color hex
    },
    source: {
      type: String,
      enum: ['GOOGLE_CALENDAR', 'ASTRONOMICAL_ENGINE', 'CUSTOM_SCHOOL', 'ACADEMIC_PRESET'],
      default: 'CUSTOM_SCHOOL',
    },
    roadmap: {
      isRoadmapMilestone: { type: Boolean, default: false },
      quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4', 'NONE'], default: 'NONE' },
      term: { type: String, enum: ['TERM_1', 'TERM_2', 'TERM_3', 'ANNUAL', 'NONE'], default: 'NONE' },
      progressStatus: {
        type: String,
        enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        default: 'PLANNED',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

calendarEventSchema.index({ academicYearId: 1, startDate: 1, endDate: 1 });
calendarEventSchema.index({ academicYear: 1, type: 1 });

const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);

export default CalendarEvent;
