import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/custom_button.dart';
import '../controllers/create_password_controller.dart';

class CreatePasswordView extends StatefulWidget {
  const CreatePasswordView({super.key});

  @override
  State<CreatePasswordView> createState() => _CreatePasswordViewState();
}

class _CreatePasswordViewState extends State<CreatePasswordView> {
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _controller = Get.find<CreatePasswordController>();
  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _submit() {
    final pass = _passwordController.text;
    final confirm = _confirmPasswordController.text;
    
    if (pass != confirm) {
      Get.snackbar('Passwords Do Not Match', 'Both passwords should be the same. Please check and try again.');
      return;
    }
    
    _controller.setPassword(pass);
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
          onPressed: () => Get.back(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 8),
              Text('Create Password', style: AppTextStyles.displayMedium)
                  .animate().fade(duration: 400.ms).slideY(begin: 0.2, curve: Curves.easeOutQuad),
              const SizedBox(height: 8),
              Text(
                'Set a strong password for your account to proceed.',
                style: AppTextStyles.bodyMedium,
              ).animate().fade(delay: 100.ms).slideY(begin: 0.2, curve: Curves.easeOutQuad),
              const SizedBox(height: 32),
              
              TextField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                decoration: InputDecoration(
                  labelText: 'New Password',
                  hintText: 'Minimum 8 characters',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  suffixIcon: IconButton(
                    icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              
              TextField(
                controller: _confirmPasswordController,
                obscureText: _obscureConfirm,
                decoration: InputDecoration(
                  labelText: 'Confirm Password',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  suffixIcon: IconButton(
                    icon: Icon(_obscureConfirm ? Icons.visibility_off : Icons.visibility),
                    onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                  ),
                ),
              ),
              const SizedBox(height: 32),
              
              Obx(() => CustomButton(
                label: 'Save & Login',
                loading: _controller.isLoading.value,
                onTap: _submit,
              )).animate().fade(delay: 400.ms).slideY(begin: 0.2, curve: Curves.easeOutQuad),
            ],
          ),
        ),
      ),
    );
  }
}
