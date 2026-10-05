import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:get/get.dart' hide GetNumUtils;
import 'package:google_fonts/google_fonts.dart';
import '../../../core/config/school_brand.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/ui/ui.dart';
import '../controllers/splash_controller.dart';

/// Brand reveal: the wordmark rises letter by letter, a sub-line opens between
/// two rules, and the tagline settles in. No logo: that is school-specific.
class SplashView extends GetView<SplashController> {
  const SplashView({super.key});

  @override
  Widget build(BuildContext context) {
    final word = SchoolBrand.wordmark;
    final reduce = Motion.reduced(context);
    final dark = AppColors.isDark;
    final wordColor = dark ? Colors.white : Brand.deep;
    Duration d(int ms) => reduce ? Duration.zero : Duration(milliseconds: ms);

    return Scaffold(
      backgroundColor: dark ? Brand.night : Brand.white,
      body: SafeArea(
        child: Stack(
          children: [
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      for (var i = 0; i < word.length; i++)
                        Text(
                          word[i],
                          style: GoogleFonts.outfit(
                            fontSize: 38,
                            fontWeight: FontWeight.w800,
                            color: wordColor,
                            letterSpacing: 3,
                            height: 1,
                          ),
                        )
                            .animate(delay: d(900 + i * 55))
                            .fadeIn(duration: d(380))
                            .slideY(begin: 0.5, end: 0, duration: d(520), curve: Motion.emphasized),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _Rule(alignment: Alignment.centerRight, delay: d(1350), duration: d(500)),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text(
                          SchoolBrand.wordmarkSub,
                          style: GoogleFonts.outfit(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: Brand.accent,
                            letterSpacing: 7,
                          ),
                        ).animate(delay: d(1300)).fadeIn(duration: d(450)),
                      ),
                      _Rule(alignment: Alignment.centerLeft, delay: d(1350), duration: d(500)),
                    ],
                  ),
                ],
              ),
            ),
            Positioned(
              left: 24,
              right: 24,
              bottom: 36,
              child: Text(
                SchoolBrand.tagline,
                textAlign: TextAlign.center,
                style: AppTextStyles.bodySmall.copyWith(
                  fontStyle: FontStyle.italic,
                  color: dark ? Colors.white54 : AppColors.inkLight,
                ),
              )
                  .animate(delay: d(1750))
                  .fadeIn(duration: d(600))
                  .slideY(begin: 0.3, end: 0, duration: d(600), curve: Motion.emphasized),
            ),
          ],
        ),
      ),
    );
  }
}

class _Rule extends StatelessWidget {
  final Alignment alignment;
  final Duration delay;
  final Duration duration;

  const _Rule({required this.alignment, required this.delay, required this.duration});

  @override
  Widget build(BuildContext context) {
    return Container(width: 30, height: 2, color: Brand.accent)
        .animate(delay: delay)
        .scaleX(begin: 0, end: 1, alignment: alignment, duration: duration, curve: Motion.emphasized);
  }
}
