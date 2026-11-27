import StudentVoice from '../models/StudentVoice.js';
import NotificationService from '../services/NotificationService.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import sendResponse from '../utils/response.js';

function sanitizeForStaff(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  if (obj.isAnonymous) {
    obj.submittedBy = null;
    obj.studentId = null;
  }
  return obj;
}

class StudentVoiceController {
  static submit = catchAsync(async (req, res) => {
    const { category, title, description, isAnonymous = false, studentId = null } = req.body;
    if (!category || !title?.trim() || !description?.trim()) {
      throw new AppError('category, title, and description are required', 400);
    }

    const record = await StudentVoice.create({
      studentId: isAnonymous ? null : studentId || null,
      submittedBy: req.user.id,
      category,
      title: title.trim(),
      description: description.trim(),
      isAnonymous: Boolean(isAnonymous),
    });

    sendResponse(res, 201, record, 'Concern submitted');
  });

  static getMySubmissions = catchAsync(async (req, res) => {
    const list = await StudentVoice.find({ submittedBy: req.user.id })
      .sort({ createdAt: -1 })
      .populate('assignedTo', 'name role');

    const sanitized = list.map((item) => {
      const obj = item.toObject();
      if (obj.isAnonymous) {
        obj.studentId = null;
      }
      return obj;
    });

    sendResponse(res, 200, sanitized);
  });

  static getQueue = catchAsync(async (req, res) => {
    const { status, category, assignedTo } = req.query;
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (assignedTo) query.assignedTo = assignedTo;

    const list = await StudentVoice.find(query)
      .sort({ createdAt: -1 })
      .populate('submittedBy', 'name role')
      .populate('studentId', 'studentName standard division')
      .populate('assignedTo', 'name role');

    sendResponse(res, 200, list.map(sanitizeForStaff));
  });

  static getOne = catchAsync(async (req, res) => {
    const record = await StudentVoice.findById(req.params.id)
      .populate('submittedBy', 'name role')
      .populate('studentId', 'studentName standard division')
      .populate('assignedTo', 'name role');

    if (!record) throw new AppError('Submission not found', 404);

    const isOwner = record.submittedBy?._id?.toString() === req.user.id || record.submittedBy?.toString() === req.user.id;
    const isStaff = ['ADMIN', 'STAFF', 'TEACHER'].includes(req.user.role);
    if (!isStaff && !isOwner) {
      throw new AppError('Not authorized to view this submission', 403);
    }

    sendResponse(res, 200, isStaff ? sanitizeForStaff(record) : record);
  });

  static assign = catchAsync(async (req, res) => {
    const { assignedTo } = req.body;
    if (!assignedTo) throw new AppError('assignedTo is required', 400);

    const record = await StudentVoice.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          assignedTo,
          status: 'under_review',
        },
      },
      { new: true }
    ).populate('assignedTo', 'name role');

    if (!record) throw new AppError('Submission not found', 404);
    sendResponse(res, 200, sanitizeForStaff(record), 'Assigned');
  });

  static addThreadMessage = catchAsync(async (req, res) => {
    const { message } = req.body;
    if (!message || !message.trim()) throw new AppError('Message is required', 400);

    const record = await StudentVoice.findById(req.params.id);
    if (!record) throw new AppError('Submission not found', 404);

    const isOwner = record.submittedBy.toString() === req.user.id;
    const isStaff = ['ADMIN', 'STAFF', 'TEACHER'].includes(req.user.role);
    if (!isStaff && !isOwner) {
      throw new AppError('Not authorized to reply to this submission', 403);
    }

    record.thread.push({
      by: req.user.id,
      byRole: req.user.role,
      message: message.trim(),
      ts: new Date(),
    });
    await record.save();

    sendResponse(res, 201, isStaff ? sanitizeForStaff(record) : record, 'Reply added');
  });

  static updateStatus = catchAsync(async (req, res) => {
    const { status } = req.body;
    if (!['submitted', 'under_review', 'action_taken', 'resolved'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const update = { status };
    if (status === 'resolved') {
      update.resolvedAt = new Date();
      update.resolvedBy = req.user.id;
    }

    const record = await StudentVoice.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    ).populate('assignedTo', 'name role');

    if (!record) throw new AppError('Submission not found', 404);

    // Best-effort notification to submitter
    try {
      await NotificationService.notifyUser({
        recipientRole: 'parent',
        recipientId: record.submittedBy,
        title: 'Student Voice Update',
        body: `Your concern "${record.title}" is now ${status.replace('_', ' ')}.`,
        data: { type: 'STUDENT_VOICE_STATUS', voiceId: record._id.toString() },
      });
    } catch {
      // Ignore push errors
    }

    sendResponse(res, 200, sanitizeForStaff(record), 'Status updated');
  });
}

export default StudentVoiceController;
