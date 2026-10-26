import 'package:flutter_test/flutter_test.dart';
import 'package:school_connect/data/repositories/calendar_repository.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('CalendarRepository returns complete 35 combined roadmap items on fallback', () async {
    final repo = CalendarRepository();
    final result = await repo.getRoadmap(academicYear: '2026-2027');

    expect(result.allItems.isNotEmpty, isTrue);
    expect(result.allItems.length, 35);

    final exams = result.allItems.where((m) => m.isExam).toList();
    final vacations = result.allItems.where((m) => m.isVacation).toList();
    final events = result.allItems.where((m) => m.isEvent).toList();
    final holidays = result.allItems.where((m) => m.isHoliday).toList();

    expect(exams.length, 6);
    expect(vacations.length, 4);
    expect(events.length, 8);
    expect(holidays.length, 13);

    expect(result.quarters.containsKey('Q1'), isTrue);
    expect(result.quarters.containsKey('Q2'), isTrue);
    expect(result.quarters.containsKey('Q3'), isTrue);
    expect(result.quarters.containsKey('Q4'), isTrue);
  });
}
