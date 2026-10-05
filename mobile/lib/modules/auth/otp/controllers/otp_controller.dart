import 'dart:convert';
import 'package:get/get.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/network/api_client.dart';

class OtpController extends GetxController {
  final phone = ''.obs;
  final isLoading = false.obs;
  final errorMsg = ''.obs;

  @override
  void onInit() {
    super.onInit();
    phone.value = Get.arguments?.toString() ?? '';
  }

  void startVerification(String inputPhone) {
    if (inputPhone.isEmpty) {
      errorMsg.value = 'Phone number is required';
      return;
    }
    if (inputPhone.length != 10 || !RegExp(r'^[6-9]\d{9}$').hasMatch(inputPhone)) {
      errorMsg.value = 'Please enter a valid 10-digit mobile number.';
      return;
    }
    phone.value = inputPhone;
    errorMsg.value = '';
  }

  Future<String?> verifyCodeAndSetup(String otp) async {
    if (otp.length != 4) {
      errorMsg.value = 'Please enter all 4 digits';
      return null;
    }

    isLoading.value = true;
    errorMsg.value = '';

    try {
      final response = await ApiClient.post('/auth/parent/verify', {
        'primaryMobileNumber': phone.value,
        'lastFourDigits': otp,
      });

      if (response.statusCode == 200) {
        final body = json.decode(response.body);
        return body['data']['parentId'] as String;
      } else {
        final body = json.decode(response.body);
        if (body['message'] != null && body['message'].toString().isNotEmpty) {
          errorMsg.value = body['message'];
        } else {
          errorMsg.value = 'The code you entered is wrong. Please check and try again.';
        }
      }
    } catch (e) {
      print('Verification error: $e');
      errorMsg.value = 'No internet connection. Please check your network and try again.';
    } finally {
      isLoading.value = false;
    }
    return null;
  }

  Future<void> setPassword(String parentId, String newPassword) async {
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
