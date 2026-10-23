import Exam from '../models/Exam.js';
import ExamResult from '../models/ExamResult.js';
import AcademicYear from '../models/AcademicYear.js';
import Student from '../models/Student.js';
import AllocationGuardService from '../services/AllocationGuardService.js';
import verifyParentOwnsStudent from '../utils/verifyParentOwnsStudent.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import sendResponse from '../utils/response.js';

class ExamController {
  /**
   * Helper to compute exam readiness for publishing
   */
  static async computeReadiness(exam) {
    const studentQuery = {
      standard: exam.standard,
      medium: exam.medium,
      isActive: { $ne: false },
      isMigrated: true
    };
    if (exam.divisions && exam.divisions.length > 0) {
      studentQuery.division = { $in: exam.divisions };
    }

    const students = await Student.find(studentQuery)
      .select('studentName rollNo division standard')
      .sort({ division: 1, rollNo: 1, studentName: 1 });

    const results = await ExamResult.find({ examId: exam._id });

    const blockers = [];
    const subjectsSummary = [];
    let overallFilled = 0;
    const totalPossibleEntries = students.length * (exam.subjects?.length || 0);

    for (const sub of (exam.subjects || [])) {
      const subIdStr = (sub.subjectId?._id || sub.subjectId).toString();
      const subResults = results.filter(r => r.subjectId.toString() === subIdStr);
      
      let filledCount = 0;
      let absentCount = 0;
      let exemptCount = 0;
      const missingStudents = [];

      for (const st of students) {
        const studentResult = subResults.find(r => r.studentId.toString() === st._id.toString());
        if (!studentResult) {
          missingStudents.push({
            studentId: st._id,
            studentName: st.studentName,
            division: st.division,
            rollNo: st.rollNo
          });
          continue;
        }

        if (studentResult.attendance === 'ABSENT') {
          absentCount++;
          filledCount++;
        } else if (studentResult.attendance === 'EXEMPT') {
          exemptCount++;
          filledCount++;
        } else if (studentResult.marksObtained != null && !isNaN(studentResult.marksObtained)) {
          filledCount++;
        } else if (sub.gradingSystem === 'Grades' && studentResult.gradeObtained) {
          filledCount++;
        } else {
          missingStudents.push({
            studentId: st._id,
            studentName: st.studentName,
            division: st.division,
            rollNo: st.rollNo
          });
        }
      }

      const isComplete = students.length > 0 && missingStudents.length === 0;
      const subName = sub.subjectId?.subjectName || 'Subject';
      if (!isComplete && students.length > 0) {
        blockers.push(`${subName}: ${missingStudents.length} student(s) pending marks`);
      }

      overallFilled += filledCount;

      subjectsSummary.push({
        subjectId: subIdStr,
        subjectName: subName,
        subjectCode: sub.subjectId?.subjectCode || '',
        maxMarks: sub.maxMarks,
        passingMarks: sub.passingMarks,
        gradingSystem: sub.gradingSystem,
        entryStatus: sub.entryStatus,
        totalExpected: students.length,
        filled: filledCount,
        absent: absentCount,
        exempt: exemptCount,
        missing: missingStudents.length,
        missingStudents: missingStudents.slice(0, 10),
        isComplete
      });
    }

    if (students.length === 0) {
      blockers.push('No active migrated students found for this class/division.');
    }

    const overallPercentage = totalPossibleEntries > 0
      ? Math.round((overallFilled / totalPossibleEntries) * 100)
      : 0;

    const canPublish = students.length > 0 && blockers.length === 0 && exam.status !== 'LOCKED';

    return {
      totalStudents: students.length,
      totalPossibleEntries,
      overallFilled,
      overallPercentage,
      subjects: subjectsSummary,
      canPublish,
      blockers
    };
  }

  /**
   * POST /api/v1/erp/exams
   * Admins create exams for a specific standard and medium.
   */
  static createExam = catchAsync(async (req, res) => {
    const { standard, divisions, medium, examName, type, status, allowTeacherPublish, subjects } = req.body;

    const activeYear = await AcademicYear.findOne({ isActive: true });
    if (!activeYear) {
      throw new AppError('No active academic year found', 400);
    }

    if (req.user.role !== 'ADMIN') {
      throw new AppError('Only administrators can schedule new exams', 403);
    }

    const exam = await Exam.create({
      academicYearId: activeYear._id,
      standard,
      divisions: divisions || [],
      medium,
      examName,
      type: type || 'FINAL',
      status: status || 'SCHEDULED',
      allowTeacherPublish: !!allowTeacherPublish,
      subjects: (subjects || []).map(s => ({
        subjectId: s.subjectId,
        examDate: s.examDate || undefined,
        startTime: s.startTime || '',
        endTime: s.endTime || '',
        gradingSystem: s.gradingSystem || 'Marks',
        maxMarks: s.maxMarks != null ? Number(s.maxMarks) : 100,
        passingMarks: s.passingMarks != null ? Number(s.passingMarks) : 35,
        entryStatus: 'PENDING'
      })),
      createdBy: req.user._id
    });

    sendResponse(res, 201, exam, 'Exam created successfully');
  });

  /**
   * GET /api/v1/erp/exams
   */
  static getExams = catchAsync(async (req, res) => {
    const { standard, medium, type, status } = req.query;

    const activeYear = await AcademicYear.findOne({ isActive: true });
    if (!activeYear) {
      return sendResponse(res, 200, []);
    }

    let query = { academicYearId: activeYear._id };
    if (standard) query.standard = standard;
    if (medium) query.medium = medium;
    if (type && type !== 'ALL') query.type = type;
    if (status && status !== 'ALL') query.status = status;

    const exams = await Exam.find(query)
      .populate('subjects.subjectId', 'subjectName subjectCode')
      .populate('createdBy', 'name email role')
      .populate('publishedBy', 'name email role')
      .sort({ createdAt: -1 });

    sendResponse(res, 200, exams);
  });

  /**
   * GET /api/v1/erp/exams/:examId
   */
  static getExamById = catchAsync(async (req, res) => {
    const { examId } = req.params;
    const exam = await Exam.findById(examId)
      .populate('subjects.subjectId', 'subjectName subjectCode')
      .populate('createdBy', 'name email role')
      .populate('publishedBy', 'name email role');

    if (!exam) throw new AppError('Exam not found', 404);
    sendResponse(res, 200, exam);
  });

  /**
   * PATCH /api/v1/erp/exams/:examId
   */
  static updateExam = catchAsync(async (req, res) => {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);
    if (!exam) throw new AppError('Exam not found', 404);

    if (req.user.role !== 'ADMIN') {
      throw new AppError('Only administrators can update exam settings', 403);
    }

    if (exam.status === 'LOCKED') {
      throw new AppError('Cannot modify a locked exam', 400);
    }

    const { examName, standard, divisions, medium, type, allowTeacherPublish, subjects, status } = req.body;
    if (examName !== undefined) exam.examName = examName;
    if (standard !== undefined) exam.standard = standard;
    if (divisions !== undefined) exam.divisions = divisions;
    if (medium !== undefined) exam.medium = medium;
    if (type !== undefined) exam.type = type;
    if (allowTeacherPublish !== undefined) exam.allowTeacherPublish = allowTeacherPublish;
    if (status !== undefined && ['DRAFT', 'SCHEDULED', 'MARKS_ENTRY'].includes(status)) {
      exam.status = status;
    }

    if (subjects && Array.isArray(subjects)) {
      exam.subjects = subjects.map(s => ({
        subjectId: s.subjectId,
        examDate: s.examDate || undefined,
        startTime: s.startTime || '',
        endTime: s.endTime || '',
        gradingSystem: s.gradingSystem || 'Marks',
        maxMarks: s.maxMarks != null ? Number(s.maxMarks) : 100,
        passingMarks: s.passingMarks != null ? Number(s.passingMarks) : 35,
        entryStatus: s.entryStatus || 'PENDING'
      }));
    }

    await exam.save();
    sendResponse(res, 200, exam, 'Exam updated successfully');
  });

  /**
   * DELETE /api/v1/erp/exams/:examId
   */
  static deleteExam = catchAsync(async (req, res) => {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);
    if (!exam) throw new AppError('Exam not found', 404);

    if (req.user.role !== 'ADMIN') {
      throw new AppError('Only administrators can delete exams', 403);
    }

    if (exam.isPublished || exam.status === 'PUBLISHED' || exam.status === 'LOCKED') {
      throw new AppError('Cannot delete a published or locked exam', 400);
    }

    await ExamResult.deleteMany({ examId });
    await Exam.findByIdAndDelete(examId);

    sendResponse(res, 200, null, 'Exam deleted successfully');
  });

  /**
   * GET /api/v1/erp/exams/results/student/:studentId
   */
  static getResultsForStudent = catchAsync(async (req, res) => {
    const { studentId } = req.params;

    if (req.user.role === 'parent') {
      await verifyParentOwnsStudent(req, studentId);
    }

    const results = await ExamResult.find({ studentId })
      .populate({ path: 'examId', select: 'examName type status isPublished maxMarks passingMarks academicYearId standard medium' })
      .populate('subjectId', 'subjectName subjectCode')
      .sort({ createdAt: -1 });

    sendResponse(res, 200, results);
  });

  /**
   * GET /api/v1/erp/exams/:examId/results?subjectId=xyz&division=A
   */
  static getExamResults = catchAsync(async (req, res) => {
    const { examId } = req.params;
    const { subjectId, division } = req.query;

    const exam = await Exam.findById(examId);
    if (!exam) throw new AppError('Exam not found', 404);

    if (subjectId && division) {
      await AllocationGuardService.verifySubjectTeacherAccess(
        req.user,
        exam.academicYearId,
        exam.standard,
        division,
        exam.medium,
        subjectId
      );

      const results = await ExamResult.find({
        examId,
        subjectId
      }).populate({
        path: 'studentId',
        match: { division: division },
        select: 'studentName admissionNo rollNo division standard medium isActive isMigrated'
      });

      const filteredResults = results.filter(r => r.studentId != null);
      return sendResponse(res, 200, filteredResults);
    }

    // Exam-wide results (for Results tab scorecard)
    if (req.user.role !== 'ADMIN' && req.user.role !== 'STAFF') {
      await AllocationGuardService.verifyExamTeacherAccess(
        req.user,
        exam.academicYearId,
        exam.standard,
        exam.divisions,
        exam.medium
      );
    }

    let query = { examId };
    if (subjectId) query.subjectId = subjectId;

    let results = await ExamResult.find(query)
      .populate({
        path: 'studentId',
        select: 'studentName admissionNo rollNo division standard medium isActive isMigrated'
      })
      .populate('subjectId', 'subjectName subjectCode');

    if (division) {
      results = results.filter(r => r.studentId && r.studentId.division === division);
    } else {
      results = results.filter(r => r.studentId != null);
    }

    sendResponse(res, 200, results);
  });

  /**
   * POST /api/v1/erp/exams/:examId/results
   * Bulk insert/update exam results with attendance
   */
  static saveExamResults = catchAsync(async (req, res) => {
    const { examId } = req.params;
    const { subjectId, division, results } = req.body;

    if (!subjectId || !division || !results) {
      throw new AppError('subjectId, division, and results are required', 400);
    }

    const exam = await Exam.findById(examId);
    if (!exam) throw new AppError('Exam not found', 404);

    if (exam.status === 'LOCKED') {
      throw new AppError('This exam is locked. Marks cannot be modified.', 400);
    }

    if (exam.status === 'PUBLISHED' && req.user.role !== 'ADMIN') {
      throw new AppError('Exam is already published. Only admin can modify published marks.', 403);
    }

    await AllocationGuardService.verifySubjectTeacherAccess(
      req.user,
      exam.academicYearId,
      exam.standard,
      division,
      exam.medium,
      subjectId
    );

    const examSubject = exam.subjects.find(s => s.subjectId.toString() === subjectId);
    if (!examSubject) {
      throw new AppError('This subject is not part of the exam', 400);
    }

    const { maxMarks, passingMarks, gradingSystem } = examSubject;

    const operations = results.map(r => {
      const attendance = ['PRESENT', 'ABSENT', 'EXEMPT'].includes(r.attendance) ? r.attendance : 'PRESENT';
      const marksObtained = attendance === 'PRESENT'
        ? (r.marksObtained !== '' && r.marksObtained != null ? Number(r.marksObtained) : null)
        : null;
      const gradeObtained = attendance === 'PRESENT' ? (r.gradeObtained || null) : null;

      return {
        updateOne: {
          filter: { examId, subjectId, studentId: r.studentId },
          update: {
            $set: {
              attendance,
              marksObtained,
              gradeObtained,
              remarks: r.remarks || '',
              enteredBy: req.user._id,
              maxMarks,
              passingMarks,
              gradingSystem,
            }
          },
          upsert: true
        }
      };
    });

    if (operations.length > 0) {
      await ExamResult.bulkWrite(operations);
    }

    // Update subject entryStatus & exam status
    if (examSubject.entryStatus === 'PENDING') {
      examSubject.entryStatus = 'IN_PROGRESS';
    }
    if (exam.status === 'SCHEDULED') {
      exam.status = 'MARKS_ENTRY';
    }
    await exam.save();

    sendResponse(res, 200, null, 'Results saved successfully');
  });

  /**
   * POST /api/v1/erp/exams/:examId/subjects/:subjectId/submit
   * Teacher marks their subject entry as submitted
   */
  static submitSubjectMarks = catchAsync(async (req, res) => {
    const { examId, subjectId } = req.params;
    const exam = await Exam.findById(examId);
    if (!exam) throw new AppError('Exam not found', 404);

    const examSubject = exam.subjects.find(s => s.subjectId.toString() === subjectId);
    if (!examSubject) {
      throw new AppError('Subject not found in this exam', 404);
    }

    examSubject.entryStatus = 'SUBMITTED';
    examSubject.submittedAt = new Date();
    examSubject.submittedBy = req.user._id;

    await exam.save();
    sendResponse(res, 200, exam, 'Subject marks submitted successfully');
  });

  /**
   * GET /api/v1/erp/exams/:examId/readiness
   * Checks whether all students have marks or are absent
   */
  static getExamReadiness = catchAsync(async (req, res) => {
    const { examId } = req.params;
    const exam = await Exam.findById(examId)
      .populate('subjects.subjectId', 'subjectName subjectCode');

    if (!exam) throw new AppError('Exam not found', 404);

    const readiness = await ExamController.computeReadiness(exam);

    // Auto-advance status if ready and currently MARKS_ENTRY
    if (readiness.canPublish && exam.status === 'MARKS_ENTRY') {
      exam.status = 'READY';
      await exam.save();
    }

    sendResponse(res, 200, readiness);
  });

  /**
   * POST /api/v1/erp/exams/:examId/publish
   * Publishes exam results to students and parents
   */
  static publishExam = catchAsync(async (req, res) => {
    const { examId } = req.params;
    const exam = await Exam.findById(examId)
      .populate('subjects.subjectId', 'subjectName subjectCode');

    if (!exam) throw new AppError('Exam not found', 404);

    if (exam.status === 'LOCKED') {
      throw new AppError('Cannot publish a locked exam', 400);
    }

    // Role & Permission checking
    if (req.user.role !== 'ADMIN') {
      if (!exam.allowTeacherPublish) {
        throw new AppError('Teacher publishing is not enabled for this exam. Only Admin can publish.', 403);
      }
      await AllocationGuardService.verifyExamTeacherAccess(
        req.user,
        exam.academicYearId,
        exam.standard,
        exam.divisions,
        exam.medium
      );
    }

    // Readiness validation
    const readiness = await ExamController.computeReadiness(exam);
    if (!readiness.canPublish) {
      throw new AppError(`Cannot publish exam: ${readiness.blockers.join('; ')}`, 400);
    }

    exam.isPublished = true;
    exam.status = 'PUBLISHED';
    exam.publishedAt = new Date();
    exam.publishedBy = req.user._id;
    await exam.save();

    sendResponse(res, 200, exam, 'Exam published successfully');
  });

  /**
   * POST /api/v1/erp/exams/:examId/unpublish
   * Reverts published exam back to ready state (Admin only)
   */
  static unpublishExam = catchAsync(async (req, res) => {
    const { examId } = req.params;

    if (req.user.role !== 'ADMIN') {
      throw new AppError('Only administrators can unpublish exams', 403);
    }

    const exam = await Exam.findById(examId);
    if (!exam) throw new AppError('Exam not found', 404);

    if (exam.status === 'LOCKED') {
      throw new AppError('Cannot unpublish a locked exam', 400);
    }

    exam.isPublished = false;
    exam.status = 'READY';
    await exam.save();

    sendResponse(res, 200, exam, 'Exam unpublished successfully');
  });
}

export default ExamController;

