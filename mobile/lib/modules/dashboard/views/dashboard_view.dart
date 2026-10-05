import '../../../core/config/client_context.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:get/get.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/ui/ui.dart';
import '../controllers/dashboard_controller.dart';
import '../widgets/dashboard_header.dart';
import '../widgets/dashboard_shimmer.dart';
import '../widgets/highlight_carousel.dart';
import '../widgets/parent_section.dart';
import '../widgets/quick_access_section.dart';
import '../widgets/student_section.dart';
import '../widgets/student_switch_section.dart';
import '../widgets/brand_refresh_indicator.dart';
import '../widgets/teacher_classes_section.dart';
import '../widgets/teacher_highlight_carousel.dart';
import '../widgets/teacher_quick_access.dart';

/// Home: one scrolling hub.
///   1. Collapsing navy header (greeting, time-of-day sun, bell, avatar)
///   2. Parent — fees hero card + parent shortcuts
///   3. Student — identity card, siblings, academic shortcuts
///   4. Latest unread school update
/// Pull down to refresh with the brand mark.
class DashboardView extends GetView<DashboardController> {
  const DashboardView({super.key});

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(statusBarColor: Colors.transparent),
      child: Scaffold(
        backgroundColor: AppColors.bg,
        body: Obx(() {
          if (controller.isLoading.value && controller.student.value == null) {
            return const DashboardShimmer();
          }
          if (controller.activeProfile.value != 'teacher' && controller.student.value == null) {
            return Center(
              child: EmptyState(
                icon: Icons.person_search_rounded,
                title: 'No student linked yet',
                message: "We couldn't find a student on this account. "
                    'Please contact the school office.',
                actionLabel: 'Try again',
                onAction: controller.refreshData,
              ),
            );
          }
          return _DashboardBody(controller: controller);
        }),
      ),
    );
  }
}

class _DashboardBody extends StatelessWidget {
  final DashboardController controller;
  const _DashboardBody({required this.controller});

  @override
  Widget build(BuildContext context) {
    final reduce = Motion.reduced(context);

    Widget entrance(int index, Widget child) {
      if (reduce) return child;
      return child
          .animate(delay: Motion.stagger(index, stepMs: 90, baseMs: 150))
          .fadeIn(duration: 420.ms)
          .slideY(begin: 0.06, end: 0, duration: 520.ms, curve: Motion.emphasized);
    }

    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
      slivers: [
        SliverPersistentHeader(
          pinned: true,
          delegate: DashboardHeaderDelegate(
            controller: controller,
            topPadding: MediaQuery.paddingOf(context).top,
          ),
        ),
        CupertinoSliverRefreshControl(
          refreshTriggerPullDistance: 110,
          refreshIndicatorExtent: 76,
          onRefresh: controller.refreshData,
          builder: (context, mode, pulled, trigger, extent) => BrandRefreshIndicator(
            mode: mode,
            pulledExtent: pulled,
            triggerDistance: trigger,
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.only(top: 24, bottom: 40),
          sliver: Obx(() {
            final isTeacherActive = controller.activeProfile.value == 'teacher';

            return SliverList(
              delegate: SliverChildListDelegate([
                if (isTeacherActive) ...[
                  entrance(0, TeacherHighlightCarousel(key: const ValueKey('t_carousel'), controller: controller)),
                  const SizedBox(height: 24),
                  entrance(1, StudentSwitchSection(key: const ValueKey('t_switch'), controller: controller)),
                  const SizedBox(height: 16),
                  if (ClientContext.has('ERP')) entrance(2, const TeacherQuickAccess(key: ValueKey('t_qa'))),
                  const SizedBox(height: 32),
                  entrance(3, TeacherClassesSection(key: const ValueKey('t_classes'), controller: controller)),
                ] else ...[
                  entrance(0, HighlightCarousel(key: const ValueKey('s_carousel'), controller: controller)),
                  const SizedBox(height: 24),
                  entrance(1, StudentSwitchSection(key: const ValueKey('s_switch'), controller: controller)),
                  const SizedBox(height: 16),
                  entrance(2, ParentSection(key: const ValueKey('s_parent'), controller: controller)),
                  const SizedBox(height: 32),
                  entrance(3, StudentSection(key: const ValueKey('s_student'), controller: controller)),
                  const SizedBox(height: 24),
                  if (ClientContext.has('ERP')) entrance(4, const QuickAccessSection(key: ValueKey('s_qa'))),
                ]
              ]),
            );
          }),
        ),
      ],
    );
  }
}
