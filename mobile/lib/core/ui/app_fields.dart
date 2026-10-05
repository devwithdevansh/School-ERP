import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import 'pressable.dart';

/// A label that sits above a form control, with an optional required marker.
class FieldLabel extends StatelessWidget {
  final String text;
  final bool required;
  const FieldLabel(this.text, {super.key, this.required = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text.rich(
        TextSpan(
          text: text,
          style: AppTextStyles.labelLarge,
          children: [
            if (required)
              TextSpan(text: '  *', style: AppTextStyles.labelLarge.copyWith(color: AppColors.red)),
          ],
        ),
      ),
    );
  }
}

/// Labelled, clearly bordered text field. Border/fill come from the app's
/// input theme (see [AppColors.fieldBorder]) so it reads in light and dark.
class AppTextField extends StatelessWidget {
  final String label;
  final bool required;
  final String? hint;
  final TextEditingController? controller;
  final int minLines;
  final int maxLines;
  final int? maxLength;
  final TextInputType? keyboardType;
  final TextCapitalization textCapitalization;
  final List<TextInputFormatter>? inputFormatters;
  final ValueChanged<String>? onChanged;
  final String? errorText;
  final Widget? prefix;

  const AppTextField({
    super.key,
    required this.label,
    this.required = false,
    this.hint,
    this.controller,
    this.minLines = 1,
    this.maxLines = 1,
    this.maxLength,
    this.keyboardType,
    this.textCapitalization = TextCapitalization.sentences,
    this.inputFormatters,
    this.onChanged,
    this.errorText,
    this.prefix,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FieldLabel(label, required: required),
        TextField(
          controller: controller,
          minLines: minLines,
          maxLines: maxLines,
          maxLength: maxLength,
          keyboardType: keyboardType,
          textCapitalization: textCapitalization,
          inputFormatters: inputFormatters,
          onChanged: onChanged,
          style: AppTextStyles.bodyLarge,
          cursorColor: AppColors.accentDeep,
          decoration: InputDecoration(
            hintText: hint,
            errorText: errorText,
            prefixIcon: prefix,
            counterStyle: AppTextStyles.bodySmall,
          ),
        ),
      ],
    );
  }
}

/// Labelled dropdown that matches [AppTextField]'s border and fill.
class AppDropdownField<T> extends StatelessWidget {
  final String label;
  final bool required;
  final T? value;
  final List<T> items;
  final String Function(T) itemLabel;
  final ValueChanged<T?>? onChanged;
  final String? hint;

  const AppDropdownField({
    super.key,
    required this.label,
    required this.items,
    required this.itemLabel,
    this.value,
    this.onChanged,
    this.required = false,
    this.hint,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FieldLabel(label, required: required),
        DropdownButtonFormField<T>(
          // initialValue only seeds the field, so re-key when the selection
          // changes from outside (e.g. a controller resets it).
          key: ValueKey(value),
          value: items.contains(value) ? value : null,
          isExpanded: true,
          icon: Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.inkMid),
          dropdownColor: AppColors.white,
          borderRadius: BorderRadius.circular(10),
          style: AppTextStyles.bodyLarge,
          decoration: InputDecoration(hintText: hint),
          items: [
            for (final item in items)
              DropdownMenuItem<T>(
                value: item,
                child: Text(itemLabel(item), maxLines: 1, overflow: TextOverflow.ellipsis),
              ),
          ],
          onChanged: onChanged,
        ),
      ],
    );
  }
}

/// A tappable field that shows a value (e.g. a date) and matches the other
/// fields' border. The caller opens whatever picker it needs in [onTap].
class AppPickerField extends StatelessWidget {
  final String label;
  final bool required;
  final String value;
  final IconData icon;
  final VoidCallback onTap;

  const AppPickerField({
    super.key,
    required this.label,
    required this.value,
    required this.onTap,
    this.icon = Icons.calendar_today_rounded,
    this.required = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FieldLabel(label, required: required),
        Pressable(
          onTap: onTap,
          pressedScale: 0.99,
          child: InputDecorator(
            decoration: InputDecoration(
              prefixIcon: Icon(icon, size: 18, color: AppColors.accentDeep),
            ),
            child: Text(value, style: AppTextStyles.bodyLarge),
          ),
        ),
      ],
    );
  }
}
