class Validators {
  static String? phone(String? value) {
    if (value == null || value.isEmpty) return 'Phone number is required';
    if (value.length != 10 || !RegExp(r'^[6-9]\d{9}$').hasMatch(value)) {
      return 'Enter Indian number or invalid number';
    }
    return null;
  }

  static String? otp(String? value) {
    if (value == null || value.isEmpty) return 'OTP is required';
    if (value.length != 6) return 'Enter 6-digit OTP';
    return null;
  }
}
