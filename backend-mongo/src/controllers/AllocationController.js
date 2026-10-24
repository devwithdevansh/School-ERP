import TeacherAllocation from '../models/TeacherAllocation.js';
import ClassTeacherAllocation from '../models/ClassTeacherAllocation.js';
import Curriculum from '../models/Curriculum.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import sendResponse from '../utils/response.js';
import { canonicalStandard, canonicalMedium } from './AcademicMasterController.js';

class AllocationController {
  // ==========================================
  // SUBJECT TEACHER ALLOCATION
  // ==========================================

  static assignSubjectTeacher = catchAsync(async (req, res) => {
    const { academicYearId, standard, division, medium, subjectId } = req.body;

    let ids = [];
    if (Array.isArray(req.body.teacherIds)) {
      ids = req.body.teacherIds.filter(Boolean).map(String);
    } else if (req.body.teacherId) {
      ids = [String(req.body.teacherId)];
    }
    // Remove duplicates while preserving order
    ids = [...new Set(ids)];

    if (ids.length === 0) {
      await TeacherAllocation.findOneAndDelete({ academicYearId, standard, division, medium, subjectId });
      return sendResponse(res, 200, null, 'Subject allocation removed');
    }

    // 1. Ensure the subject is linked in the curriculum for this standard/medium
    const normStandard = canonicalStandard(standard);
    const normMedium = canonicalMedium(medium);

    let curriculum = await Curriculum.findOne({
      academicYearId,
      standard: { $regex: new RegExp(`^${normStandard.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      medium: { $regex: new RegExp(`^${normMedium.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    if (!curriculum) {
      curriculum = await Curriculum.create({
        academicYearId,
        standard: normStandard,
        medium: normMedium,
        subjects: [subjectId]
      });
    } else {
      if (curriculum.standard !== normStandard || curriculum.medium !== normMedium) {
        curriculum.standard = normStandard;
        curriculum.medium = normMedium;
      }
      const subjectExists = curriculum.subjects.some(id => {
        const rawId = typeof id === 'object' && id?._id ? id._id.toString() : id.toString();
        return rawId === subjectId.toString();
      });
      if (!subjectExists) {
        curriculum.subjects.push(subjectId);
      }
      await curriculum.save();
    }

    // 2. Upsert allocation with teacherIds array & primary teacherId
    const allocation = await TeacherAllocation.findOneAndUpdate(
      { academicYearId, standard, division, medium, subjectId },
      { 
        teacherId: ids[0],
        teacherIds: ids
      },
      { new: true, upsert: true, runValidators: true }
    )
      .populate('teacherId', 'name email role')
      .populate('teacherIds', 'name email role')
      .populate('subjectId');

    sendResponse(res, 200, allocation, 'Subject teachers assigned successfully');
  });

  static getSubjectAllocations = catchAsync(async (req, res) => {
    const { academicYearId, standard, division, medium } = req.query;
    
    let query = { academicYearId };
    if (standard) query.standard = standard;
    if (division) query.division = division;
    if (medium) query.medium = medium;

    const allocations = await TeacherAllocation.find(query)
      .populate('teacherId', 'name email role')
      .populate('teacherIds', 'name email role')
      .populate('subjectId')
      .sort({ standard: 1, division: 1, medium: 1 });
      
    sendResponse(res, 200, allocations);
  });

  static removeSubjectAllocation = catchAsync(async (req, res) => {
    await TeacherAllocation.findByIdAndDelete(req.params.id);
    sendResponse(res, 200, null, 'Subject allocation removed');
  });

  // ==========================================
  // CLASS TEACHER (HOMEROOM) ALLOCATION
  // ==========================================

  static assignClassTeacher = catchAsync(async (req, res) => {
    const { academicYearId, teacherId, standard, division, medium } = req.body;

    // Upsert homeroom teacher
    const allocation = await ClassTeacherAllocation.findOneAndUpdate(
      { academicYearId, standard, division, medium },
      { teacherId },
      { new: true, upsert: true, runValidators: true }
    ).populate('teacherId', 'name email role');

    sendResponse(res, 200, allocation, 'Class teacher assigned successfully');
  });

  static getClassTeacherAllocations = catchAsync(async (req, res) => {
    const { academicYearId, standard, division, medium } = req.query;
    
    let query = { academicYearId };
    if (standard) query.standard = standard;
    if (division) query.division = division;
    if (medium) query.medium = medium;

    const allocations = await ClassTeacherAllocation.find(query)
      .populate('teacherId', 'name email role')
      .sort({ standard: 1, division: 1, medium: 1 });
      
    sendResponse(res, 200, allocations);
  });

  static removeClassTeacherAllocation = catchAsync(async (req, res) => {
    await ClassTeacherAllocation.findByIdAndDelete(req.params.id);
    sendResponse(res, 200, null, 'Class teacher allocation removed');
  });
}

export default AllocationController;
