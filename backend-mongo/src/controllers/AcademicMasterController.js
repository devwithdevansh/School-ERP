import Subject from '../models/Subject.js';
import Curriculum from '../models/Curriculum.js';
import AcademicYear from '../models/AcademicYear.js';
import TeacherAllocation from '../models/TeacherAllocation.js';
import Timetable from '../models/Timetable.js';
import Homework from '../models/Homework.js';
import Exam from '../models/Exam.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import sendResponse from '../utils/response.js';

class AcademicMasterController {
  // ==========================================
  // SUBJECT MASTER
  // ==========================================

  static createSubject = catchAsync(async (req, res) => {
    const { subjectName, subjectCode, type, gradingSystem } = req.body;
    
    const existing = await Subject.findOne({ subjectName });
    if (existing) {
      throw new AppError('Subject with this name already exists', 400);
    }
    
    const subject = await Subject.create({ subjectName, subjectCode, type, gradingSystem });
    sendResponse(res, 201, subject, 'Subject created successfully');
  });

  static getSubjects = catchAsync(async (req, res) => {
    const subjects = await Subject.find().sort({ subjectName: 1 });
    sendResponse(res, 200, subjects);
  });

  static updateSubject = catchAsync(async (req, res) => {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!subject) throw new AppError('Subject not found', 404);
    sendResponse(res, 200, subject, 'Subject updated successfully');
  });

  static deleteSubject = catchAsync(async (req, res) => {
    const { id } = req.params;

    // A subject still referenced elsewhere must not be deleted — doing so
    // would silently orphan the reference (Mongoose populate just returns
    // null), which previously broke the teacher homework picker: the
    // subject name showed as a blank fallback and publishing failed with
    // an opaque error, because the allocation pointed at a Subject that no
    // longer existed.
    const inUse = await Curriculum.findOne({ subjects: id });
    if (inUse) {
      throw new AppError('Cannot delete subject because it is used in a curriculum', 400);
    }

    const allocated = await TeacherAllocation.findOne({ subjectId: id });
    if (allocated) {
      throw new AppError('Cannot delete subject because a teacher is currently allocated to teach it', 400);
    }

    const scheduled = await Timetable.findOne({ subjectId: id });
    if (scheduled) {
      throw new AppError('Cannot delete subject because it appears in a timetable', 400);
    }

    const hasHomework = await Homework.findOne({ subjectId: id });
    if (hasHomework) {
      throw new AppError('Cannot delete subject because homework has been assigned for it', 400);
    }

    const inExam = await Exam.findOne({ 'subjects.subjectId': id });
    if (inExam) {
      throw new AppError('Cannot delete subject because it is used in an exam', 400);
    }

    await Subject.findByIdAndDelete(id);
    sendResponse(res, 200, null, 'Subject deleted successfully');
  });

  // ==========================================
  // CURRICULUM
  // ==========================================

  static createOrUpdateCurriculum = catchAsync(async (req, res) => {
    let { academicYearId, standard, medium, subjects } = req.body;
    if (!academicYearId || !standard || !medium) {
      throw new AppError('academicYearId, standard, and medium are required', 400);
    }
    
    // Ensure AcademicYear exists
    const year = await AcademicYear.findById(academicYearId);
    if (!year) throw new AppError('Academic year not found', 404);

    const normStandard = canonicalStandard(standard);
    const normMedium = canonicalMedium(medium);

    // Case-insensitive lookup to find any existing record (e.g. "NURSERY" vs "Nursery")
    const existingList = await Curriculum.find({
      academicYearId,
      standard: { $regex: new RegExp(`^${normStandard.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      medium: { $regex: new RegExp(`^${normMedium.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    let curriculum;
    if (existingList.length > 0) {
      curriculum = existingList[0];
      curriculum.standard = normStandard;
      curriculum.medium = normMedium;
      curriculum.subjects = subjects || [];
      await curriculum.save();

      // If duplicate records exist, remove extra duplicates
      if (existingList.length > 1) {
        for (let i = 1; i < existingList.length; i++) {
          await Curriculum.findByIdAndDelete(existingList[i]._id);
        }
      }
    } else {
      curriculum = await Curriculum.create({
        academicYearId,
        standard: normStandard,
        medium: normMedium,
        subjects: subjects || []
      });
    }
    
    const populated = await Curriculum.findById(curriculum._id).populate('subjects');
    sendResponse(res, 200, populated, 'Curriculum saved successfully');
  });

  static getCurriculums = catchAsync(async (req, res) => {
    const { academicYearId } = req.query;
    let query = {};
    if (academicYearId) query.academicYearId = academicYearId;
    
    const rawCurriculums = await Curriculum.find(query).populate('subjects').sort({ standard: 1, medium: 1 });

    // Auto-deduplicate any case-mismatched duplicates (e.g., "NURSERY" and "Nursery" in same year & medium)
    const grouped = new Map();
    const toDeleteIds = [];

    for (const curr of rawCurriculums) {
      const yearKey = curr.academicYearId?.toString() || '';
      const stdKey = canonicalStandard(curr.standard).toLowerCase();
      const medKey = canonicalMedium(curr.medium).toLowerCase();
      const groupKey = `${yearKey}:${stdKey}:${medKey}`;

      if (grouped.has(groupKey)) {
        // Duplicate found! Merge subjects into the primary record
        const primary = grouped.get(groupKey);
        const existingSubjectIds = new Set(
          primary.subjects.map(s => (s._id || s).toString())
        );
        for (const sub of curr.subjects) {
          const subId = (sub._id || sub).toString();
          if (!existingSubjectIds.has(subId)) {
            existingSubjectIds.add(subId);
            primary.subjects.push(sub);
          }
        }
        toDeleteIds.push(curr._id);
      } else {
        // Normalize standard and medium on the record
        curr.standard = canonicalStandard(curr.standard);
        curr.medium = canonicalMedium(curr.medium);
        grouped.set(groupKey, curr);
      }
    }

    // Clean up duplicate documents from DB in background if any were found
    if (toDeleteIds.length > 0) {
      Curriculum.deleteMany({ _id: { $in: toDeleteIds } }).catch(err => {
        console.error('Failed to cleanup duplicate curriculums:', err);
      });
      // Also save updated subjects on the primary records if merged
      for (const primary of grouped.values()) {
        Curriculum.findByIdAndUpdate(primary._id, {
          standard: primary.standard,
          medium: primary.medium,
          subjects: primary.subjects.map(s => s._id || s)
        }).catch(err => console.error('Failed to update canonical curriculum:', err));
      }
    }

    sendResponse(res, 200, Array.from(grouped.values()));
  });

  static deleteCurriculum = catchAsync(async (req, res) => {
    const { id } = req.params;
    const deleted = await Curriculum.findByIdAndDelete(id);
    if (!deleted) throw new AppError('Curriculum mapping not found', 404);
    sendResponse(res, 200, null, 'Curriculum mapping deleted successfully');
  });
}

export const canonicalStandard = (s) => {
  if (!s) return '';
  const str = String(s).trim();
  const lower = str.toLowerCase();
  if (lower === 'nursery') return 'Nursery';
  if (lower === 'playhouse') return 'Playhouse';
  if (lower === 'lkg') return 'LKG';
  if (lower === 'ukg') return 'UKG';
  return str;
};

export const canonicalMedium = (m) => {
  if (!m) return 'English';
  const str = String(m).trim().toLowerCase();
  if (str === 'gujarati') return 'Gujarati';
  if (str === 'hindi') return 'Hindi';
  return 'English';
};

export default AcademicMasterController;
