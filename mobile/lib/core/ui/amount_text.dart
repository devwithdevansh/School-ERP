import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../design/motion.dart';
import '../theme/app_text_styles.dart';

/// A rupee amount that counts up the first time it appears and glides to
/// the new value whenever it changes (e.g. after a payment).
class AmountText extends StatelessWidget {
  final double value;
  final TextStyle? style;
  final String prefix;
  final bool animateIn;
  final Duration? duration;

  const AmountText(
    this.value, {
    super.key,
    this.style,
    this.prefix = '₹',
    this.animateIn = true,
    this.duration,
  });

  static final NumberFormat _format = NumberFormat.decimalPattern('en_IN');

  static String format(double value, {String prefix = '₹'}) =>
      '$prefix${_format.format(value.round())}';

  @override
  Widget build(BuildContext context) {
    final reduce = Motion.reduced(context);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: animateIn && !reduce ? 0 : value, end: value),
      duration: reduce ? Duration.zero : (duration ?? const Duration(milliseconds: 900)),
      curve: Motion.emphasized,
      builder: (context, v, _) => Text(
        format(v, prefix: prefix),
        style: style ?? AppTextStyles.monoMedium,
      ),
    );
  }
}
