import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/custom_textfield.dart';
import '../../../../core/routes/app_routes.dart';
import '../controllers/otp_controller.dart';

class OtpView extends StatefulWidget {
  const OtpView({super.key});

  @override
  State<OtpView> createState() => _OtpViewState();
}

class _OtpViewState extends State<OtpView> {
  final _phoneController = TextEditingController();
  final List<TextEditingController> _otpControllers =
      List.generate(4, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(4, (_) => FocusNode());
  late final OtpController _controller;

  @override
  void initState() {
    super.initState();
    _controller = Get.find<OtpController>();
  }

  @override
  void dispose() {
    _phoneController.dispose();
    for (final c in _otpControllers) {
      c.dispose();
    }
    for (final f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  void _onOtpChanged(String val, int index) {
    if (val.isNotEmpty && index < 3) {
      _focusNodes[index + 1].requestFocus();
    } else if (val.isEmpty && index > 0) {
      _focusNodes[index - 1].requestFocus();
    }
    _controller.errorMsg.value = '';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: AppColors.ink),
          onPressed: Get.back,
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Obx(() {
            final isPhoneEmpty = _controller.phone.value.isEmpty;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),
                Text('Account Verification', style: AppTextStyles.displayMedium)
                    .animate().fade(duration: 400.ms).slideY(begin: 0.2, curve: Curves.easeOutQuad),
                const SizedBox(height: 8),
                Text(
                  isPhoneEmpty
                      ? 'Enter your registered mobile number to set up or reset your password.'
                      : 'For verification, please enter the last 4 digits of your mobile number (+91 ${_controller.phone.value}).',
                  style: AppTextStyles.bodyMedium,
                ).animate().fade(delay: 100.ms).slideY(begin: 0.2, curve: Curves.easeOutQuad),
                const SizedBox(height: 32),

                if (isPhoneEmpty) ...[
                  CustomTextField(
                    label: 'Registered Mobile Number',
                    hint: '98765 43210',
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    maxLength: 10,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    prefix: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text('+91', style: AppTextStyles.bodyLarge.copyWith(color: AppColors.ink)),
                    ),
                  ).animate().fade(delay: 200.ms).slideY(begin: 0.2, curve: Curves.easeOutQuad),
                  const SizedBox(height: 24),
                  CustomButton(
                    label: 'Continue',
                    loading: _controller.isLoading.value,
                    onTap: () {
                      _controller.startVerification(_phoneController.text.trim());
                    },
                  ).animate().fade(delay: 300.ms).slideY(begin: 0.2, curve: Curves.easeOutQuad),
                ] else ...[
                  // 4 OTP boxes
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: List.generate(
                      4,
                      (i) => _OtpBox(
                        index: i,
                        otpControllers: _otpControllers,
                        focusNodes: _focusNodes,
                        onChanged: _onOtpChanged,
                      ),
                    ),
                  ).animate().fade(delay: 200.ms).slideY(begin: 0.2, curve: Curves.easeOutQuad),
                  const SizedBox(height: 32),
                  if (_controller.errorMsg.value.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Text(
                        _controller.errorMsg.value,
                        style: AppTextStyles.bodySmall.copyWith(color: AppColors.red),
                      ),
                    ).animate().fade(delay: 300.ms),
                  CustomButton(
                    label: 'Verify Code',
                    loading: _controller.isLoading.value,
                    onTap: () async {
                      final otp = _otpControllers.map((c) => c.text).join();
                      final parentId = await _controller.verifyCodeAndSetup(otp);
                      if (parentId != null && context.mounted) {
                        Get.toNamed(AppRoutes.createPassword, arguments: parentId);
                      }
                    },
                  ).animate().fade(delay: 400.ms).slideY(begin: 0.2, curve: Curves.easeOutQuad),
                  const SizedBox(height: 24),
                  Center(
                    child: TextButton(
                      onPressed: () {
                        _controller.phone.value = '';
                        for (final c in _otpControllers) {
                          c.clear();
                        }
                      },
                      child: Text(
                        'Change Mobile Number',
                        style: AppTextStyles.labelLarge.copyWith(color: AppColors.primaryMid),
                      ),
                    ).animate().fade(delay: 500.ms),
                  ),
                ],
              ],
            );
          }),
        ),
      ),
    );
  }
}

class _OtpBox extends StatelessWidget {
  final int index;
  final List<TextEditingController> otpControllers;
  final List<FocusNode> focusNodes;
  final void Function(String, int) onChanged;

  const _OtpBox({
    required this.index,
    required this.otpControllers,
    required this.focusNodes,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 50,
      height: 60,
      child: TextField(
        controller: otpControllers[index],
        focusNode: focusNodes[index],
        textAlign: TextAlign.center,
        keyboardType: TextInputType.number,
        maxLength: 1,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        style: AppTextStyles.h1,
        decoration: InputDecoration(
          counterText: '',
          filled: true,
          fillColor: AppColors.white,
          contentPadding: EdgeInsets.zero,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: AppColors.border, width: 1.5),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: AppColors.border, width: 1.5),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: AppColors.primaryMid, width: 2),
          ),
        ),
        onChanged: (val) => onChanged(val, index),
      ),
    );
  }
}
