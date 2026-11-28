import ConceptTag from '../models/ConceptTag.js';
import MasteryRecord from '../models/MasteryRecord.js';
import ImprovementPlan from '../models/ImprovementPlan.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import sendResponse from '../utils/response.js';

class AcademicIntelligenceController {
  // ─── Concept Tags ───────────────────────────────────────────────────────────

  /**
   * GET /concept-tags?subjectId=
   * Returns all concept tags for a subject, sorted by chapterNumber + sequence.
   */
  getConceptTags = catchAsync(async (req, res, next) => {
    const { subjectId } = req.query;
    if (!subjectId) return next(new AppError('subjectId is required', 400));

    const tags = await ConceptTag.find({ subjectId })
      .sort({ chapterNumber: 1, sequence: 1 })
      .lean();

    sendResponse(res, 200, { status: 'success', results: tags.length, data: tags });
  });

  /**
   * POST /concept-tags
   * ADMIN/TEACHER. Create a single concept tag.
   */
  createConceptTag = catchAsync(async (req, res, next) => {
    const { subjectId, chapterNumber, chapterName, conceptName, sequence } = req.body;
    if (!subjectId || !chapterNumber || !chapterName || !conceptName) {
      return next(new AppError('subjectId, chapterNumber, chapterName and conceptName are required', 400));
    }

    const tag = await ConceptTag.create({
      subjectId,
      chapterNumber,
      chapterName,
      conceptName,
      sequence: sequence ?? 0,
      createdBy: req.user._id,
    });

    sendResponse(res, 201, { status: 'success', data: tag });
  });

  /**
   * POST /concept-tags/bulk
   * ADMIN/TEACHER. Array of tags — upsert by subjectId+chapterNumber+conceptName.
   */
  bulkCreateConceptTags = catchAsync(async (req, res, next) => {
    const tags = req.body;
    if (!Array.isArray(tags) || tags.length === 0) {
      return next(new AppError('Request body must be a non-empty array of concept tags', 400));
    }

    const ops = tags.map((t) => ({
      updateOne: {
        filter: {
          subjectId: t.subjectId,
          chapterNumber: t.chapterNumber,
          conceptName: t.conceptName,
        },
        update: {
          $set: {
            chapterName: t.chapterName,
            sequence: t.sequence ?? 0,
            createdBy: req.user._id,
          },
        },
        upsert: true,
      },
    }));

    const result = await ConceptTag.bulkWrite(ops, { ordered: false });

    sendResponse(res, 200, {
      status: 'success',
      data: {
        matched: result.matchedCount,
        upserted: result.upsertedCount,
        modified: result.modifiedCount,
      },
    });
  });

  // ─── Mastery ─────────────────────────────────────────────────────────────────

  /**
   * GET /mastery/student/:studentId?subjectId=&academicYearId=
   * Returns mastery records grouped by conceptTag with average masteryPct and trend.
   */
  getMasteryForStudent = catchAsync(async (req, res, next) => {
    const { studentId } = req.params;
    const { subjectId, academicYearId } = req.query;

    const match = { studentId: new (await import('mongoose')).default.Types.ObjectId(studentId) };
    if (academicYearId) match.academicYearId = new (await import('mongoose')).default.Types.ObjectId(academicYearId);

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'concepttags',
          localField: 'conceptTagId',
          foreignField: '_id',
          as: 'conceptTag',
        },
      },
      { $unwind: '$conceptTag' },
    ];

    if (subjectId) {
      pipeline.push({
        $match: { 'conceptTag.subjectId': new (await import('mongoose')).default.Types.ObjectId(subjectId) },
      });
    }

    pipeline.push(
      {
        $group: {
          _id: '$conceptTagId',
          conceptTag: { $first: '$conceptTag' },
          avgMasteryPct: { $avg: '$masteryPct' },
          trend: {
            $push: {
              examId: '$examId',
              date: '$date',
              masteryPct: '$masteryPct',
            },
          },
        },
      },
      { $sort: { 'conceptTag.chapterNumber': 1, 'conceptTag.sequence': 1 } }
    );

    const data = await MasteryRecord.aggregate(pipeline);

    sendResponse(res, 200, { status: 'success', results: data.length, data });
  });

  /**
   * GET /gaps/student/:studentId?threshold=60&academicYearId=
   * Returns concepts where average mastery < threshold, sorted ascending.
   */
  getMasteryGaps = catchAsync(async (req, res, next) => {
    const { studentId } = req.params;
    const threshold = parseFloat(req.query.threshold ?? '60');
    const { academicYearId } = req.query;

    const mongoose = (await import('mongoose')).default;
    const match = { studentId: new mongoose.Types.ObjectId(studentId) };
    if (academicYearId) match.academicYearId = new mongoose.Types.ObjectId(academicYearId);

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'concepttags',
          localField: 'conceptTagId',
          foreignField: '_id',
          as: 'conceptTag',
        },
      },
      { $unwind: '$conceptTag' },
      {
        $group: {
          _id: '$conceptTagId',
          conceptTag: { $first: '$conceptTag' },
          avgMasteryPct: { $avg: '$masteryPct' },
        },
      },
      { $match: { avgMasteryPct: { $lt: threshold } } },
      { $sort: { avgMasteryPct: 1 } },
    ];

    const data = await MasteryRecord.aggregate(pipeline);

    sendResponse(res, 200, { status: 'success', results: data.length, data });
  });

  /**
   * POST /mastery
   * ADMIN/TEACHER. Bulk upsert mastery records.
   * Body: Array of {studentId, conceptTagId, examId, academicYearId, marksObtained, maxMarks}
   */
  saveMasteryRecords = catchAsync(async (req, res, next) => {
    const records = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return next(new AppError('Request body must be a non-empty array of mastery records', 400));
    }

    const ops = records.map((r) => {
      const masteryPct = parseFloat(((r.marksObtained / r.maxMarks) * 100).toFixed(2));
      return {
        updateOne: {
          filter: {
            studentId: r.studentId,
            conceptTagId: r.conceptTagId,
            examId: r.examId,
          },
          update: {
            $set: {
              academicYearId: r.academicYearId,
              marksObtained: r.marksObtained,
              maxMarks: r.maxMarks,
              masteryPct,
              date: r.date ?? new Date(),
            },
          },
          upsert: true,
        },
      };
    });

    const result = await MasteryRecord.bulkWrite(ops, { ordered: false });

    sendResponse(res, 200, {
      status: 'success',
      data: {
        matched: result.matchedCount,
        upserted: result.upsertedCount,
        modified: result.modifiedCount,
      },
    });
  });

  // ─── Improvement Plans ───────────────────────────────────────────────────────

  /**
   * GET /plans/student/:studentId
   * Returns active improvement plans for a student.
   */
  getImprovementPlans = catchAsync(async (req, res, next) => {
    const { studentId } = req.params;

    const plans = await ImprovementPlan.find({ studentId, status: 'active' })
      .populate('conceptTagId', 'conceptName chapterName chapterNumber subjectId')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    sendResponse(res, 200, { status: 'success', results: plans.length, data: plans });
  });

  /**
   * POST /plans
   * ADMIN/TEACHER. Create improvement plan.
   */
  createImprovementPlan = catchAsync(async (req, res, next) => {
    const { studentId, conceptTagId, description, resources, targetDate } = req.body;

    if (!studentId || !conceptTagId || !description || !targetDate) {
      return next(new AppError('studentId, conceptTagId, description and targetDate are required', 400));
    }

    const plan = await ImprovementPlan.create({
      studentId,
      conceptTagId,
      createdBy: req.user._id,
      description,
      resources: resources ?? [],
      targetDate,
    });

    sendResponse(res, 201, { status: 'success', data: plan });
  });

  /**
   * PATCH /plans/:id
   * Update status, description, resources, targetDate, completedAt.
   */
  updateImprovementPlan = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const allowedFields = ['status', 'description', 'resources', 'targetDate', 'completedAt'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (updates.status === 'completed' && !updates.completedAt) {
      updates.completedAt = new Date();
    }

    const plan = await ImprovementPlan.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
    if (!plan) return next(new AppError('Improvement plan not found', 404));

    sendResponse(res, 200, { status: 'success', data: plan });
  });
}

export default new AcademicIntelligenceController();
