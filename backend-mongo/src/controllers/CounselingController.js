import CounselingRecord from '../models/CounselingRecord.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import sendResponse from '../utils/response.js';

class CounselingController {
  // POST /counseling
  createRecord = catchAsync(async (req, res, next) => {
    const { studentId, type, trigger, summary, privateNotes, supportPlan, visibility } = req.body;

    const record = await CounselingRecord.create({
      studentId,
      createdBy: req.user.id,
      type,
      trigger,
      summary,
      privateNotes,
      supportPlan,
      visibility,
    });

    sendResponse(res, 201, { data: record, message: 'Counseling record created successfully' });
  });

  // GET /counseling/student/:studentId
  getForStudent = catchAsync(async (req, res, next) => {
    const { studentId } = req.params;
    const role = req.user.role;
    let filter = { studentId };

    if (role === 'ADMIN' || role === 'STAFF') {
      // see all records
    } else if (role === 'TEACHER') {
      filter.createdBy = req.user.id;
    } else if (role === 'parent') {
      filter.parentConsentGiven = true;
      filter.status = { $ne: 'closed' };
    } else {
      return next(new AppError('Not authorized to view counseling records', 403));
    }

    const records = await CounselingRecord.find(filter)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('closedBy', 'name');

    sendResponse(res, 200, { data: records, results: records.length });
  });

  // GET /counseling/mine
  getMyRecords = catchAsync(async (req, res, next) => {
    const records = await CounselingRecord.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 })
      .populate('studentId', 'name admissionNumber')
      .populate('closedBy', 'name');

    sendResponse(res, 200, { data: records, results: records.length });
  });

  // PATCH /counseling/:id
  updateRecord = catchAsync(async (req, res, next) => {
    const record = await CounselingRecord.findById(req.params.id);
    if (!record) return next(new AppError('Counseling record not found', 404));

    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'STAFF';
    const isCreator = record.createdBy.toString() === req.user.id.toString();

    if (!isAdmin && !isCreator) {
      return next(new AppError('You do not have permission to update this record', 403));
    }

    const allowedFields = ['summary', 'privateNotes', 'visibility', 'type'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        record[field] = req.body[field];
      }
    });

    await record.save();
    sendResponse(res, 200, { data: record, message: 'Counseling record updated' });
  });

  // PATCH /counseling/:id/milestone/:idx
  updateMilestone = catchAsync(async (req, res, next) => {
    const record = await CounselingRecord.findById(req.params.id);
    if (!record) return next(new AppError('Counseling record not found', 404));

    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'STAFF';
    const isCreator = record.createdBy.toString() === req.user.id.toString();

    if (!isAdmin && !isCreator) {
      return next(new AppError('Not authorized to update milestones for this record', 403));
    }

    const idx = parseInt(req.params.idx, 10);
    if (isNaN(idx) || idx < 0 || idx >= record.supportPlan.length) {
      return next(new AppError('Invalid milestone index', 400));
    }

    const { status } = req.body;
    if (!['pending', 'in_progress', 'achieved'].includes(status)) {
      return next(new AppError('Invalid milestone status', 400));
    }

    record.supportPlan[idx].status = status;
    if (status === 'achieved') {
      record.supportPlan[idx].completedAt = new Date();
    } else {
      record.supportPlan[idx].completedAt = null;
    }

    // Update overall record status based on milestones
    const allAchieved = record.supportPlan.every((m) => m.status === 'achieved');
    const anyInProgress = record.supportPlan.some((m) => m.status === 'in_progress');
    if (allAchieved && record.supportPlan.length > 0) {
      record.status = 'in_progress';
    } else if (anyInProgress) {
      record.status = 'in_progress';
    }

    await record.save();
    sendResponse(res, 200, { data: record, message: 'Milestone updated' });
  });

  // POST /counseling/:id/milestone
  addMilestone = catchAsync(async (req, res, next) => {
    const record = await CounselingRecord.findById(req.params.id);
    if (!record) return next(new AppError('Counseling record not found', 404));

    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'STAFF';
    const isCreator = record.createdBy.toString() === req.user.id.toString();

    if (!isAdmin && !isCreator) {
      return next(new AppError('Not authorized to add milestones to this record', 403));
    }

    const { milestone, targetDate, status } = req.body;
    if (!milestone || !targetDate) {
      return next(new AppError('Milestone and targetDate are required', 400));
    }

    record.supportPlan.push({ milestone, targetDate, status: status || 'pending' });
    await record.save();

    sendResponse(res, 201, { data: record, message: 'Milestone added' });
  });

  // PATCH /counseling/:id/close
  closeRecord = catchAsync(async (req, res, next) => {
    const record = await CounselingRecord.findById(req.params.id);
    if (!record) return next(new AppError('Counseling record not found', 404));

    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'STAFF';
    const isCreator = record.createdBy.toString() === req.user.id.toString();

    if (!isAdmin && !isCreator) {
      return next(new AppError('Not authorized to close this record', 403));
    }

    if (record.status === 'closed') {
      return next(new AppError('Record is already closed', 400));
    }

    record.status = 'closed';
    record.closedAt = new Date();
    record.closedBy = req.user.id;

    await record.save();
    sendResponse(res, 200, { data: record, message: 'Counseling record closed' });
  });

  // PATCH /counseling/:id/consent
  grantParentConsent = catchAsync(async (req, res, next) => {
    const record = await CounselingRecord.findById(req.params.id);
    if (!record) return next(new AppError('Counseling record not found', 404));

    record.parentConsentGiven = true;
    record.visibility = 'with_parent_consent';
    await record.save();

    sendResponse(res, 200, { data: record, message: 'Parent consent granted' });
  });
}

export default new CounselingController();
