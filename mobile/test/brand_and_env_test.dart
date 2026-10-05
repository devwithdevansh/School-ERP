import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:school_connect/core/config/env.dart';
import 'package:school_connect/core/config/school_brand.dart';
import 'package:school_connect/core/constants/app_constants.dart';
import 'package:school_connect/core/theme/app_colors.dart';

void main() {
  group('Env', () {
    test('falls back to a local backend when BACKEND_URL is empty', () async {
      dotenv.loadFromString(envString: 'BACKEND_URL=\n');
      await Env.init();
      expect(Env.baseUrl, endsWith(':3000/api/v1'));
      expect(Env.baseUrl, isNot(contains('hostinger')));
    });

    test('normalises BACKEND_URL (trailing slash and pre-appended /api/v1)', () async {
      dotenv.loadFromString(envString: 'BACKEND_URL=https://api.myschool.test///\n');
      await Env.init();
      expect(Env.baseUrl, 'https://api.myschool.test/api/v1');

      dotenv.loadFromString(envString: 'BACKEND_URL=https://api.myschool.test/api/v1\n');
      await Env.init();
      expect(Env.baseUrl, 'https://api.myschool.test/api/v1');
    });
  });

  group('SchoolBrand', () {
    test('uses generic defaults, no school-specific text', () {
      dotenv.loadFromString(envString: '', isOptional: true);
      expect(SchoolBrand.appName, 'School Connect');
      expect(SchoolBrand.wordmark, 'SCHOOL');
      expect(SchoolBrand.contactLine, isEmpty);
    });

    test('reads branding from the env file', () {
      dotenv.loadFromString(envString: '''
APP_NAME=Greenfield Connect
SCHOOL_NAME=Greenfield Public School
SCHOOL_WORDMARK=greenfield
SCHOOL_PHONE=+91 99999 00000
SCHOOL_WEBSITE=greenfield.test
''');
      expect(SchoolBrand.appName, 'Greenfield Connect');
      expect(SchoolBrand.schoolName, 'Greenfield Public School');
      expect(SchoolBrand.wordmark, 'GREENFIELD');
      // blank email is skipped, parts are joined
      expect(SchoolBrand.contactLine, 'Ph: +91 99999 00000  |  greenfield.test');
    });
  });

  test('academic year label rolls over in June', () {
    final label = AppConstants.academicYear;
    expect(RegExp(r'^\d{4}-\d{2}$').hasMatch(label), isTrue, reason: label);
    final start = int.parse(label.substring(0, 4));
    final end = int.parse(label.substring(5));
    expect((start + 1) % 100, end);
  });

  test('light and dark palettes both resolve every role', () {
    for (final dark in [false, true]) {
      AppColors.isDark = dark;
      for (final c in [
        AppColors.primary, AppColors.accent, AppColors.accentDeep, AppColors.accentPale, AppColors.ink,
        AppColors.bg, AppColors.cardBg, AppColors.border, AppColors.teal, AppColors.red, AppColors.amber,
      ]) {
        expect(c.a, greaterThan(0));
      }
    }
    AppColors.isDark = false;
  });

}
