import SafeReachConsent from '../models/SafeReachConsent.js';
import TripRecord from '../models/TripRecord.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import sendResponse from '../utils/response.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180,
    φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Best-effort FCM notification. Logs errors but does not throw.
 */
async function sendFCMNotification(parentId, payload) {
  try {
    // TODO: integrate your FCM/Firebase Admin SDK here.
    // e.g.: await admin.messaging().send({ token: parentFcmToken, notification: payload });
    console.log(`[SafeReach] FCM notification to parent ${parentId}:`, payload);
  } catch (err) {
    console.error('[SafeReach] FCM send failed (best-effort):', err.message);
  }
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

const SafeReachController = {
  /**
   * PUT /consent
   * Parent sets their consent + home address.
   */
  setConsent: catchAsync(async (req, res, next) => {
    const {
      studentId,
      academicYearId,
      consentGiven,
      homeAddress,
      homeRadiusMeters,
      notifyDelayAfterMinutes,
    } = req.body;

    if (!studentId || !academicYearId) {
      return next(new AppError('studentId and academicYearId are required', 400));
    }

    const parentId = req.user._id;

    const update = {
      parentId,
      consentUpdatedAt: new Date(),
    };

    if (typeof consentGiven === 'boolean') update.consentGiven = consentGiven;
    if (homeAddress) update.homeAddress = homeAddress;
    if (homeRadiusMeters != null) update.homeRadiusMeters = homeRadiusMeters;
    if (notifyDelayAfterMinutes != null)
      update.notifyDelayAfterMinutes = notifyDelayAfterMinutes;

    const consent = await SafeReachConsent.findOneAndUpdate(
      { studentId, academicYearId },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );

    sendResponse(res, 200, { data: consent, message: 'Consent updated successfully' });
  }),

  /**
   * GET /consent/:studentId
   * Parent / admin retrieves the consent record.
   */
  getConsent: catchAsync(async (req, res, next) => {
    const { studentId } = req.params;
    const { academicYearId } = req.query;

    const filter = { studentId };
    if (academicYearId) filter.academicYearId = academicYearId;

    const consent = await SafeReachConsent.findOne(filter)
      .populate('studentId', 'studentName medium standard division photoUrl')
      .populate('parentId', 'parentName primaryMobileNumber email');

    if (!consent) {
      return next(new AppError('No consent record found for this student', 404));
    }

    sendResponse(res, 200, { data: consent });
  }),

  /**
   * POST /trip/start
   * Creates a new active TripRecord. Requires consent.
   */
  startTrip: catchAsync(async (req, res, next) => {
    const { studentId, tripType, expectedArrivalTime, academicYearId } = req.body;

    if (!studentId || !tripType || !academicYearId) {
      return next(
        new AppError('studentId, tripType, and academicYearId are required', 400)
      );
    }

    // Verify consent
    const consent = await SafeReachConsent.findOne({ studentId, academicYearId });
    if (!consent || !consent.consentGiven) {
      return next(
        new AppError(
          'SafeReach consent has not been given for this student',
          403
        )
      );
    }

    // Prevent duplicate active trip for same student + day + tripType
    const { start, end } = todayRange();
    const existing = await TripRecord.findOne({
      studentId,
      tripType,
      date: { $gte: start, $lte: end },
      status: 'active',
    });
    if (existing) {
      return next(
        new AppError('An active trip of this type already exists for today', 409)
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const trip = await TripRecord.create({
      studentId,
      academicYearId,
      tripType,
      date: today,
      status: 'active',
      startTime: new Date(),
      expectedArrivalTime: expectedArrivalTime ? new Date(expectedArrivalTime) : null,
      startedBy: req.user._id,
    });

    sendResponse(res, 201, { data: trip, message: 'Trip started successfully' });
  }),

  /**
   * PATCH /trip/:id/location
   * Updates lastLocation. Auto-confirms if inside home geofence.
   */
  updateLocation: catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { lat, lng } = req.body;

    if (lat == null || lng == null) {
      return next(new AppError('lat and lng are required', 400));
    }

    const trip = await TripRecord.findById(id);
    if (!trip) return next(new AppError('Trip not found', 404));
    if (trip.status !== 'active') {
      return next(new AppError('Trip is not active', 400));
    }

    trip.lastLocation = { lat, lng, updatedAt: new Date() };

    // Check delay
    if (
      trip.expectedArrivalTime &&
      new Date() > trip.expectedArrivalTime &&
      trip.status === 'active'
    ) {
      trip.status = 'delayed';
    }

    await trip.save();

    // Check geofence
    const consent = await SafeReachConsent.findOne({
      studentId: trip.studentId,
      academicYearId: trip.academicYearId,
    });

    if (
      consent?.consentGiven &&
      consent?.homeAddress?.lat != null &&
      consent?.homeAddress?.lng != null
    ) {
      const dist = haversineMeters(
        lat,
        lng,
        consent.homeAddress.lat,
        consent.homeAddress.lng
      );

      if (dist <= consent.homeRadiusMeters && trip.status !== 'arrived') {
        // Auto-confirm arrival
        trip.status = 'arrived';
        trip.endTime = new Date();
        await trip.save();

        await sendFCMNotification(consent.parentId, {
          title: 'SafeReach: Student Arrived',
          body: `Your child has arrived home safely.`,
        });

        return sendResponse(res, 200, {
          data: trip,
          message: 'Location updated — arrival auto-confirmed (inside geofence)',
        });
      }
    }

    sendResponse(res, 200, { data: trip, message: 'Location updated' });
  }),

  /**
   * PATCH /trip/:id/arrive
   * Manually confirms arrival.
   */
  confirmArrival: catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const trip = await TripRecord.findById(id);
    if (!trip) return next(new AppError('Trip not found', 404));
    if (['cancelled', 'arrived'].includes(trip.status)) {
      return next(new AppError(`Trip is already ${trip.status}`, 400));
    }

    trip.status = 'arrived';
    trip.endTime = new Date();
    await trip.save();

    // Best-effort FCM
    const consent = await SafeReachConsent.findOne({
      studentId: trip.studentId,
      academicYearId: trip.academicYearId,
    });
    if (consent?.parentId) {
      await sendFCMNotification(consent.parentId, {
        title: 'SafeReach: Student Arrived',
        body: 'Your child has arrived home safely.',
      });
    }

    sendResponse(res, 200, { data: trip, message: 'Arrival confirmed' });
  }),

  /**
   * PATCH /trip/:id/cancel
   * Cancels an active trip.
   */
  cancelTrip: catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const trip = await TripRecord.findById(id);
    if (!trip) return next(new AppError('Trip not found', 404));
    if (trip.status !== 'active') {
      return next(new AppError(`Cannot cancel a trip with status '${trip.status}'`, 400));
    }

    trip.status = 'cancelled';
    trip.endTime = new Date();
    await trip.save();

    sendResponse(res, 200, { data: trip, message: 'Trip cancelled' });
  }),

  /**
   * GET /trip/today?academicYearId=&studentId=
   * Returns today's trips. Admin/staff: all students. Parent: filtered by their child.
   */
  getTodayStatus: catchAsync(async (req, res) => {
    const { academicYearId, studentId } = req.query;
    const { start, end } = todayRange();

    const filter = { date: { $gte: start, $lte: end } };
    if (academicYearId) filter.academicYearId = academicYearId;
    if (studentId) filter.studentId = studentId;

    const trips = await TripRecord.find(filter)
      .populate('studentId', 'studentName medium standard division rollNo photoUrl')
      .populate('startedBy', 'name role')
      .sort({ startTime: -1 });

    sendResponse(res, 200, { data: trips, count: trips.length });
  }),

  /**
   * GET /trip/history?studentId=&limit=20
   * Returns recent trips for a student.
   */
  getTripHistory: catchAsync(async (req, res, next) => {
    const { studentId, limit = 20 } = req.query;

    if (!studentId) {
      return next(new AppError('studentId is required', 400));
    }

    const trips = await TripRecord.find({ studentId })
      .populate('studentId', 'studentName medium standard division rollNo photoUrl')
      .sort({ date: -1, startTime: -1 })
      .limit(Number(limit));

    sendResponse(res, 200, { data: trips, count: trips.length });
  }),
};

export default SafeReachController;
