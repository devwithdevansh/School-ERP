import 'dart:convert';
import 'package:get/get.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/routes/app_routes.dart';

class CreatePasswordController extends GetxController {
  final isLoading = false.obs;
  late final String parentId;

  @override
  void onInit() {
    super.onInit();
    parentId = Get.arguments as String? ?? '';
    if (parentId.isEmpty) {
      Get.snackbar('Setup Error', 'Something went wrong. Please go back and try again.');
    }
  }

  Future<void> setPassword(String newPassword) async {
    if (newPassword.length < 8) {
      Get.snackbar('Password Too Short', 'Please use at least 8 characters for a safe password.');
      return;
    }

    isLoading.value = true;
    try {
      final response = await ApiClient.post('/auth/parent/set-password', {
        'parentId': parentId,
        'newPassword': newPassword,
      });

      if (response.statusCode == 200) {
        Get.snackbar(
          'Password Set!',
          'Your password is ready. Please login to continue.',
          snackPosition: SnackPosition.BOTTOM,
        );
        Get.offAllNamed(AppRoutes.login);
      } else {
        final body = json.decode(response.body);
        Get.snackbar('Something went wrong', 'Could not save your password. Please try again.');
      }
    } catch (e) {
      print('Password setup error: $e');
      Get.snackbar('No Internet Connection', 'Please check your internet and try again.');
    } finally {
      isLoading.value = false;
    }
  }
}
