import 'package:get/get.dart';
import '../../../data/models/timetable_period_model.dart';
import '../../../data/repositories/timetable_repository.dart';

const _dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

class TeacherTimetableController extends GetxController {
  final _repo = TimetableRepository();

  final isLoading = true.obs;
  final _periods = <TimetablePeriodModel>[].obs;
  final selectedDay = _dayOrder[DateTime.now().weekday <= 6 ? DateTime.now().weekday - 1 : 0].obs;

  @override
  void onInit() {
    super.onInit();
    loadTimetable();
  }

  Future<void> loadTimetable() async {
    isLoading.value = true;
    final periods = await _repo.getMyTimetable();
    periods.sort((a, b) => a.startTime.compareTo(b.startTime));
    _periods.assignAll(periods);
    isLoading.value = false;
  }

  List<TimetablePeriodModel> periodsFor(String day) =>
      _periods.where((p) => p.dayOfWeek == day).toList();

  void selectDay(String day) {
    selectedDay.value = day;
  }
}
