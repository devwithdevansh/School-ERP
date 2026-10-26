import DocumentRecord from '../models/DocumentRecord.js';
import Student from '../models/Student.js';
import Parent from '../models/Parent.js';
import AppError from '../utils/AppError.js';
import logger from '../config/logger.js';

export class DocumentController {
  /**
   * Issue one or batch certificates / documents.
   * POST /api/v1/documents/issue
   */
  static async issueDocument(req, res, next) {
    try {
      const {
        documentType,
        title,
        academicYear,
        academicYearId,
        eventName,
        eventDate,
        achievement,
        bodyText,
        templateId,
        signatory1,
        signatory2,
        metadata,
        recipients, // Array of student recipient objects or a single student object
      } = req.body;

      if (!documentType || !title) {
        return next(new AppError('Document type and title are required', 400));
      }

      const recipientList = Array.isArray(recipients) && recipients.length > 0
        ? recipients
        : req.body.studentName
        ? [
            {
              studentId: req.body.studentId,
              studentName: req.body.studentName,
              standard: req.body.standard || '',
              division: req.body.division || '',
              grNo: req.body.grNo || '',
              rollNo: req.body.rollNo || null,
              achievement: req.body.achievement || achievement || '',
              bodyText: req.body.bodyText || bodyText || '',
            },
          ]
        : [];

      if (recipientList.length === 0) {
        return next(new AppError('At least one recipient student is required', 400));
      }

      const yearCode = academicYear ? academicYear.replace(/[^0-9]/g, '').slice(-4) : new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-4);
      const recordsToInsert = [];

      for (let i = 0; i < recipientList.length; i++) {
        const r = recipientList[i];
        const certNumber = r.certificateNumber || `CERT/${yearCode}/${timestamp}-${String(i + 1).padStart(3, '0')}`;

        recordsToInsert.push({
          academicYearId: academicYearId || null,
          academicYear: academicYear || '',
          documentType: documentType || 'EVENT_CERTIFICATE',
          certificateNumber: certNumber,
          title,
          recipientType: 'STUDENT',
          studentId: r.studentId || null,
          studentName: r.studentName,
          standard: r.standard || '',
          division: r.division || '',
          grNo: r.grNo || '',
          rollNo: r.rollNo || null,
          eventName: eventName || '',
          eventDate: eventDate ? new Date(eventDate) : null,
          achievement: r.achievement || achievement || '',
          bodyText: r.bodyText || bodyText || '',
          templateId: templateId || 'classic-gold',
          issuedDate: new Date(),
          issuedBy: req.user?._id || null,
          signatory1: signatory1 || { name: 'Principal', title: 'Head of Institution' },
          signatory2: signatory2 || { name: 'Event Coordinator', title: 'Coordinator' },
          status: 'ISSUED',
          metadata: { ...metadata, ...(r.metadata || {}) },
        });
      }

      const savedRecords = await DocumentRecord.insertMany(recordsToInsert);

      res.status(201).json({
        success: true,
        message: `Successfully issued ${savedRecords.length} document(s)`,
        count: savedRecords.length,
        documents: savedRecords,
      });
    } catch (err) {
      logger.error('Error issuing document:', err);
      next(err);
    }
  }

  /**
   * Get list of issued documents with filtering.
   * GET /api/v1/documents
   */
  static async getIssuedDocuments(req, res, next) {
    try {
      const {
        documentType,
        standard,
        division,
        academicYear,
        studentId,
        search,
        status,
        limit = 50,
        page = 1,
      } = req.query;

      const query = {};

      if (documentType && documentType !== 'ALL') {
        query.documentType = documentType;
      }
      if (standard && standard !== 'ALL') {
        query.standard = standard;
      }
      if (division && division !== 'ALL') {
        query.division = division.toUpperCase();
      }
      if (academicYear && academicYear !== 'ALL') {
        query.academicYear = academicYear;
      }
      if (studentId) {
        query.studentId = studentId;
      }
      if (status && status !== 'ALL') {
        query.status = status;
      }

      if (search) {
        query.$or = [
          { studentName: { $regex: search, $options: 'i' } },
          { certificateNumber: { $regex: search, $options: 'i' } },
          { title: { $regex: search, $options: 'i' } },
          { eventName: { $regex: search, $options: 'i' } },
          { grNo: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const [documents, total] = await Promise.all([
        DocumentRecord.find(query)
          .sort({ issuedDate: -1, createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit, 10))
          .lean(),
        DocumentRecord.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        documents,
      });
    } catch (err) {
      logger.error('Error fetching issued documents:', err);
      next(err);
    }
  }

  /**
   * Get single document record.
   * GET /api/v1/documents/:id
   */
  static async getDocumentById(req, res, next) {
    try {
      const { id } = req.params;
      const doc = await DocumentRecord.findById(id).lean();

      if (!doc) {
        return next(new AppError('Document not found', 404));
      }

      res.status(200).json({
        success: true,
        document: doc,
      });
    } catch (err) {
      logger.error('Error fetching document by ID:', err);
      next(err);
    }
  }

  /**
   * Revoke an issued document.
   * PATCH /api/v1/documents/:id/revoke
   */
  static async revokeDocument(req, res, next) {
    try {
      const { id } = req.params;
      const doc = await DocumentRecord.findByIdAndUpdate(
        id,
        { status: 'REVOKED' },
        { new: true }
      );

      if (!doc) {
        return next(new AppError('Document not found', 404));
      }

      res.status(200).json({
        success: true,
        message: 'Document status set to REVOKED',
        document: doc,
      });
    } catch (err) {
      logger.error('Error revoking document:', err);
      next(err);
    }
  }

  /**
   * Fetch active students formatted with full data for I-Card generation.
   * Supports: Standard wise, Division wise, Whole School, Single student, and live Search.
   * GET /api/v1/documents/id-cards
   */
  static async getIdCardStudents(req, res, next) {
    try {
      const {
        standard,
        division,
        medium,
        studentId,
        search,
        limit = 500,
      } = req.query;

      const query = { isActive: true };

      if (studentId) {
        query._id = studentId;
      } else {
        if (standard && standard !== 'ALL') {
          query.standard = standard;
        }
        if (division && division !== 'ALL') {
          query.division = division.toUpperCase();
        }
        if (medium && medium !== 'ALL') {
          query.medium = medium;
        }
        if (search) {
          query.$or = [
            { studentName: { $regex: search, $options: 'i' } },
            { grNo: { $regex: search, $options: 'i' } },
            { studentCode: { $regex: search, $options: 'i' } },
          ];
        }
      }

      const students = await Student.find(query)
        .populate('parentId', 'parentName primaryMobileNumber secondaryMobileNumber address')
        .sort({ standard: 1, division: 1, rollNo: 1, studentName: 1 })
        .limit(parseInt(limit, 10))
        .lean();

      const formatted = students.map((s) => {
        const parent = s.parentId || {};
        const bloodGroup = s.profile?.bloodGroup || 'N/A';
        const dob = s.dob ? new Date(s.dob).toISOString().split('T')[0] : '';

        return {
          _id: s._id,
          id: s._id.toString(),
          studentCode: s.studentCode || '',
          studentName: s.studentName,
          surname: s.surname || '',
          fatherName: s.fatherName || '',
          motherName: s.motherName || '',
          fullName: [s.studentName, s.fatherName, s.surname].filter(Boolean).join(' ') || s.studentName,
          grNo: s.grNo || s.studentCode || 'N/A',
          rollNo: s.rollNo || '-',
          standard: s.standard,
          division: s.division,
          classLabel: `${s.standard} - ${s.division}`,
          medium: s.medium || 'English',
          gender: s.gender || 'N/A',
          dob,
          bloodGroup,
          photoUrl: s.photoUrl || null,
          parentName: parent.parentName || s.fatherName || 'Parent / Guardian',
          parentMobile: parent.primaryMobileNumber || '',
          emergencyContact: parent.primaryMobileNumber || parent.secondaryMobileNumber || 'N/A',
          address: parent.address || 'Address on file',
          transportType: s.transportType || 'None',
        };
      });

      res.status(200).json({
        success: true,
        total: formatted.length,
        students: formatted,
      });
    } catch (err) {
      logger.error('Error fetching ID card students:', err);
      next(err);
    }
  }
}

export default DocumentController;
