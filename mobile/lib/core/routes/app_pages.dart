import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../modules/splash/bindings/splash_binding.dart';
import '../../modules/splash/views/splash_view.dart';
import '../../modules/onboarding/bindings/onboarding_binding.dart';
import '../../modules/onboarding/views/onboarding_view.dart';
import '../../modules/auth/login/bindings/login_binding.dart';
import '../../modules/auth/login/views/login_view.dart';
import '../../modules/auth/otp/bindings/otp_binding.dart';
import '../../modules/auth/otp/views/otp_view.dart';
import '../../modules/auth/create_password/bindings/create_password_binding.dart';
import '../../modules/auth/create_password/views/create_password_view.dart';
import '../../modules/dashboard/bindings/dashboard_binding.dart';
import '../../modules/dashboard/views/dashboard_view.dart';
import '../../modules/fees/fee_summary/bindings/fee_summary_binding.dart';
import '../../modules/fees/fee_summary/views/fee_summary_view.dart';
import '../../modules/fees/pending_fees/bindings/pending_fees_binding.dart';
import '../../modules/fees/pending_fees/views/pending_fees_view.dart';
import '../../modules/fees/receipt_details/bindings/receipt_details_binding.dart';
import '../../modules/fees/receipt_details/views/receipt_details_view.dart';
import '../../modules/notifications/bindings/notifications_binding.dart';
import '../../modules/notifications/views/notifications_view.dart';
import '../../modules/profile/bindings/profile_binding.dart';
import '../../modules/profile/views/profile_view.dart';
import '../../modules/attendance/views/attendance_view.dart';
import '../../modules/timetable/views/timetable_view.dart';
import '../../modules/results/views/results_view.dart';
import '../../modules/homework/views/homework_view.dart';
import '../../modules/leave_request/views/leave_request_view.dart';
import '../../modules/messages/views/messages_view.dart';
import '../../modules/teacher_attendance/bindings/teacher_attendance_binding.dart';
import '../../modules/teacher_attendance/views/teacher_attendance_view.dart';
import '../../modules/teacher_leaves/bindings/teacher_leaves_binding.dart';
import '../../modules/teacher_leaves/views/teacher_leaves_view.dart';
import '../../modules/teacher_marks/bindings/teacher_marks_binding.dart';
import '../../modules/teacher_marks/views/teacher_marks_view.dart';
import '../../modules/teacher_timetable/bindings/teacher_timetable_binding.dart';
import '../../modules/teacher_timetable/views/teacher_timetable_view.dart';
import '../../modules/teacher_messages/bindings/teacher_messages_binding.dart';
import '../../modules/teacher_messages/views/teacher_messages_view.dart';
import '../../modules/teacher_homework/bindings/teacher_homework_binding.dart';
import '../../modules/teacher_homework/views/teacher_homework_view.dart';
import '../design/motion.dart';
import '../theme/app_colors.dart';
import '../ui/transitions.dart';
import '../widgets/coming_soon_view.dart';
import 'app_routes.dart';

class AppPages {
  static final List<GetPage> pages = [
    GetPage(
      name: AppRoutes.splash,
      page: () => const SplashView(),
      binding: SplashBinding(),
    ),
    GetPage(
      name: AppRoutes.onboarding,
      page: () => const OnboardingView(),
      binding: OnboardingBinding(),
    ),
    GetPage(
      name: AppRoutes.login,
      page: () => const LoginView(),
      binding: LoginBinding(),
    ),
    GetPage(
      name: AppRoutes.otp,
      page: () => const OtpView(),
      binding: OtpBinding(),
    ),
    GetPage(
      name: AppRoutes.createPassword,
      page: () => const CreatePasswordView(),
      binding: CreatePasswordBinding(),
    ),
    GetPage(
      name: AppRoutes.dashboard,
      page: () => const DashboardView(),
      binding: DashboardBinding(),
    ),
    GetPage(
      name: AppRoutes.feeSummary,
      page: () => const FeeSummaryView(),
      binding: FeeSummaryBinding(),
    ),
    GetPage(
      name: AppRoutes.pendingFees,
      page: () => const PendingFeesView(),
      binding: PendingFeesBinding(),
    ),
    GetPage(
      name: AppRoutes.receiptDetails,
      page: () => const ReceiptDetailsView(),
      binding: ReceiptDetailsBinding(),
    ),
    GetPage(
      name: AppRoutes.notifications,
      page: () => const NotificationsView(),
      binding: NotificationsBinding(),
    ),
    GetPage(
      name: AppRoutes.profile,
      page: () => const ProfileView(),
      binding: ProfileBinding(),
    ),
    GetPage(
      name: AppRoutes.attendance,
      page: () => const AttendanceView(),
    ),
    GetPage(
      name: AppRoutes.timetable,
      page: () => const TimetableView(),
    ),
    GetPage(
      name: AppRoutes.results,
      page: () => const ResultsView(),
    ),
    GetPage(
      name: AppRoutes.homework,
      page: () => const HomeworkView(),
    ),
    GetPage(
      name: AppRoutes.noticeBoard,
      page: () => ComingSoonView(
        title: 'Notice Board',
        icon: Icons.campaign_rounded,
        color: AppColors.primary,
      ),
    ),
    GetPage(
      name: AppRoutes.transport,
      page: () => ComingSoonView(
        title: 'Transport',
        icon: Icons.directions_bus_rounded,
        color: AppColors.primary,
      ),
    ),
    GetPage(
      name: AppRoutes.leaveRequest,
      page: () => const LeaveRequestView(),
    ),
    GetPage(
      name: AppRoutes.messages,
      page: () => const MessagesView(),
    ),
    // Teacher Modules
    GetPage(
      name: AppRoutes.teacherAttendance,
      page: () => const TeacherAttendanceView(),
      binding: TeacherAttendanceBinding(),
    ),
    GetPage(
      name: AppRoutes.teacherTimetable,
      page: () => const TeacherTimetableView(),
      binding: TeacherTimetableBinding(),
    ),
    GetPage(
      name: AppRoutes.teacherMarks,
      page: () => const TeacherMarksView(),
      binding: TeacherMarksBinding(),
    ),
    GetPage(
      name: AppRoutes.teacherLeaves,
      page: () => const TeacherLeavesView(),
      binding: TeacherLeavesBinding(),
    ),
    GetPage(
      name: AppRoutes.teacherMessages,
      page: () => const TeacherMessagesView(),
      binding: TeacherMessagesBinding(),
    ),
    GetPage(
      name: AppRoutes.teacherHomework,
      page: () => const TeacherHomeworkView(),
      binding: TeacherHomeworkBinding(),
    ),
  ]
      .map((p) => p.copy(
            customTransition: AppTransition(),
            transitionDuration: Motion.screen,
          ))
      .toList();
}
