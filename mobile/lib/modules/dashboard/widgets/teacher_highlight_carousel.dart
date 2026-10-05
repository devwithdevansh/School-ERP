import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/ui/ui.dart';
import '../controllers/dashboard_controller.dart';

class TeacherHighlightCarousel extends StatefulWidget {
  final DashboardController controller;
  const TeacherHighlightCarousel({super.key, required this.controller});

  @override
  State<TeacherHighlightCarousel> createState() => _TeacherHighlightCarouselState();
}

class _TeacherHighlightCarouselState extends State<TeacherHighlightCarousel> {
  int _current = 0;

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final leavesCount = widget.controller.teacherPendingLeavesCount.value;
      final todayClasses = widget.controller.teacherTodayClasses;

      String nextClassText = 'No more classes';
      if (todayClasses.isNotEmpty) {
        // Find next class based on time
        // For simplicity, just pick the first class that hasn't ended yet
        // or just the first class if none
        nextClassText = '${todayClasses.first.standard}-${todayClasses.first.division} • ${todayClasses.first.subjectName ?? 'Subject'}';
      }

      final List<Map<String, dynamic>> highlights = [
        {
          'title': 'Leaves to Review',
          'subtitle': '$leavesCount Pending Requests',
          'emoji': '📋',
          'gradient': [Brand.accent, Brand.accent.withValues(alpha: 0.8)],
        },
        {
          'title': 'Next Class',
          'subtitle': nextClassText,
          'emoji': '📚',
          'gradient': [Brand.deep, Brand.deep.withValues(alpha: 0.8)],
        },
        {
          'title': 'Pending Marks',
          'subtitle': 'Check Exam Module',
          'emoji': '📝',
          'gradient': [AppColors.teal, AppColors.teal.withValues(alpha: 0.8)],
        },
      ];

      return Column(
        children: [
          SizedBox(
            height: 124,
            child: PageView.builder(
              controller: PageController(viewportFraction: 0.92),
              onPageChanged: (i) => setState(() => _current = i),
              physics: const BouncingScrollPhysics(),
              itemCount: highlights.length,
              itemBuilder: (context, i) {
                final h = highlights[i];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: _TeacherHighlightCard(data: h),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
          _DotIndicator(count: highlights.length, current: _current),
        ],
      );
    });
  }
}

class _TeacherHighlightCard extends StatelessWidget {
  final Map<String, dynamic> data;
  const _TeacherHighlightCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final gradient = data['gradient'] as List<Color>;
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(Radii.lg),
        gradient: LinearGradient(
          colors: gradient,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: gradient.first.withValues(alpha: 0.25),
            blurRadius: 12,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -16,
            bottom: -16,
            child: Icon(
              Icons.stars_rounded,
              size: 110,
              color: Colors.white.withValues(alpha: 0.08),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  children: [
                    Text(data['emoji'], style: const TextStyle(fontSize: 22)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        data['title'],
                        style: AppTextStyles.labelLarge.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  data['subtitle'],
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: Colors.white.withValues(alpha: 0.85),
                    fontSize: 13,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DotIndicator extends StatelessWidget {
  final int count;
  final int current;
  const _DotIndicator({required this.count, required this.current});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(count, (i) {
        final active = i == current;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 280),
          curve: Curves.easeInOut,
          margin: const EdgeInsets.symmetric(horizontal: 3),
          width: active ? 20 : 7,
          height: 7,
          decoration: BoxDecoration(
            color: active ? AppColors.primary : AppColors.border,
            borderRadius: BorderRadius.circular(4),
          ),
        );
      }),
    );
  }
}
