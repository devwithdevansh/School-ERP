import '../ui/status_pill.dart';

const _monthsShort = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const _weekdaysShort = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/// "15 Sep"
String fmtShortDate(DateTime d) => '${d.day} ${_monthsShort[d.month]}';

/// "Tue, 15 Sep 2026"
String fmtLongDate(DateTime d) =>
    '${_weekdaysShort[d.weekday]}, ${d.day} ${_monthsShort[d.month]} ${d.year}';

DateTime dateOnly(DateTime d) {
  final l = d.toLocal();
  return DateTime(l.year, l.month, l.day);
}

/// Whole calendar days from today to [due] (negative once it has passed).
/// Compared by calendar date, so work due today is "Due today" all day
/// rather than "overdue" from the first minute after midnight.
int daysUntil(DateTime due, {DateTime? now}) =>
    dateOnly(due).difference(dateOnly(now ?? DateTime.now())).inDays;

/// Human label + tone for a due date: "Overdue 2d", "Due today", "Due tomorrow", "Due in 4 days".
(String, PillTone) dueLabel(DateTime due, {DateTime? now}) {
  final d = daysUntil(due, now: now);
  if (d < 0) return ('Overdue ${-d}d', PillTone.danger);
  if (d == 0) return ('Due today', PillTone.warning);
  if (d == 1) return ('Due tomorrow', PillTone.warning);
  if (d <= 3) return ('Due in $d days', PillTone.warning);
  return ('Due in $d days', PillTone.neutral);
}

/// Minutes since midnight for "08:00 AM", "8:05 pm" or "14:30"; null if unparseable.
int? parseClock(String raw) {
  final m = RegExp(r'^\s*(\d{1,2}):(\d{2})\s*([AaPp][Mm])?\s*$').firstMatch(raw);
  if (m == null) return null;
  var h = int.parse(m.group(1)!);
  final min = int.parse(m.group(2)!);
  final ap = m.group(3)?.toLowerCase();
  if (ap == 'pm' && h < 12) h += 12;
  if (ap == 'am' && h == 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

int minutesNow([DateTime? now]) {
  final n = now ?? DateTime.now();
  return n.hour * 60 + n.minute;
}
