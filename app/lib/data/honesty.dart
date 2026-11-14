// The repository's honesty rules, as plain functions so they can be tested.
import 'models.dart';

const puneOffset = Duration(hours: 5, minutes: 30);

/// The calendar date in Pune (Asia/Kolkata has no daylight saving).
DateTime puneDate(DateTime now) {
  final t = now.toUtc().add(puneOffset);
  return DateTime.utc(t.year, t.month, t.day);
}

DateTime _date(String ymd) {
  final p = ymd.split('-').map(int.parse).toList();
  return DateTime.utc(p[0], p[1], p[2]);
}

/// Entries checked more than 90 days ago need a re-check.
const staleAfterDays = 90;

bool needsRecheck(DateTime checkedAt, DateTime now) =>
    puneDate(now).difference(DateTime.utc(checkedAt.year, checkedAt.month, checkedAt.day)).inDays > staleAfterDays;

/// Never "Free" for an unknown price.
String priceText(String? priceNote) => known(priceNote) ?? 'Price not confirmed';
String costText(String? costNote) => known(costNote) ?? 'Cost not confirmed';

/// Dated listings hide once `expires_at` has passed. A dated listing with no
/// `expires_at` hides after the end of its last day in Pune. Recurring ones stay.
bool isExpired(EventListing e, DateTime now) {
  if (e.isRecurring) return false;
  if (e.expiresAt != null) return !now.isBefore(e.expiresAt!);
  final last = e.endRaw != null ? _date(e.endRaw!.substring(0, 10)) : _date(e.startDate!);
  return puneDate(now).isAfter(last);
}

/// The listings to show, in date order, recurring ones last.
List<EventListing> currentEvents(Iterable<EventListing> all, DateTime now) {
  final live = all.where((e) => !isExpired(e, now)).toList();
  live.sort((a, b) {
    if (a.isRecurring != b.isRecurring) return a.isRecurring ? 1 : -1;
    if (a.isRecurring) return a.name.compareTo(b.name);
    return a.startDate!.compareTo(b.startDate!);
  });
  return live;
}

/// Today through the coming Sunday (just today when it is Sunday), in Pune.
(DateTime, DateTime) weekendWindow(DateTime now) {
  final today = puneDate(now);
  return (today, today.add(Duration(days: DateTime.sunday - today.weekday)));
}

/// Dated, unexpired listings whose dates touch the window from today to Sunday.
List<EventListing> thisWeekend(Iterable<EventListing> all, DateTime now) {
  final (from, to) = weekendWindow(now);
  return currentEvents(all, now).where((e) {
    if (e.isRecurring) return false;
    final first = _date(e.startDate!);
    final last = e.endRaw != null ? _date(e.endRaw!.substring(0, 10)) : first;
    return !first.isAfter(to) && !last.isBefore(from);
  }).toList();
}

/// What the phone calendar gets, following scripts/calendar.mjs: a timed entry only
/// when the data carries an exact start; otherwise an all-day entry on the listed
/// dates. No end time is guessed. Recurring listings get nothing.
class CalendarSlot {
  const CalendarSlot({required this.timed, required this.start, required this.end});
  final bool timed;
  final DateTime start;

  /// For timed entries with no stated end this equals [start] (nothing invented).
  /// For all-day entries it is the exclusive end date.
  final DateTime end;
  bool get hasStatedEnd => timed ? end != start : true;
}

CalendarSlot? calendarSlot(EventListing e) {
  if (e.startDate == null) return null;
  if (e.start != null) return CalendarSlot(timed: true, start: e.start!.toUtc(), end: (e.end ?? e.start!).toUtc());
  final first = _date(e.startDate!);
  var last = e.endRaw != null ? _date(e.endRaw!.substring(0, 10)) : first;
  if (last.isBefore(first)) last = first;
  return CalendarSlot(timed: false, start: first, end: last.add(const Duration(days: 1)));
}

/// The note every calendar entry carries (scripts/calendar.mjs).
String calendarNote(EventListing e) =>
    "Read from the organiser's page on ${isoDate(e.checkedAt)}. Dates and times can change: confirm on the page before you go."
    '${e.status == Verification.partial ? ' Partial listing: some details are not confirmed.' : ''}';

const _months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

String isoDate(DateTime d) => '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// "2026-11-13" -> "13 November 2026" (as long_date in the Gleam planner).
String longDate(DateTime d) => '${d.day} ${_months[d.month - 1]} ${d.year}';
String longDateIso(String iso) {
  final p = iso.split('-');
  if (p.length != 3) return iso;
  final m = int.tryParse(p[1]), day = int.tryParse(p[2]);
  if (m == null || day == null || m < 1 || m > 12) return iso;
  return '$day ${_months[m - 1]} ${p[0]}';
}

/// "Sat 14 Nov 2026" for an event card.
String eventDay(String ymd) {
  final d = _date(ymd);
  return '${_days[d.weekday - 1]} ${d.day} ${_months[d.month - 1].substring(0, 3)} ${d.year}';
}

/// Exact start time in Pune, e.g. "4:00 PM".
String puneTime(DateTime instant) {
  final t = instant.toUtc().add(puneOffset);
  final h = t.hour % 12 == 0 ? 12 : t.hour % 12;
  return '$h:${t.minute.toString().padLeft(2, '0')} ${t.hour < 12 ? 'AM' : 'PM'}';
}

String activityLabel(Activity a) => switch (a) {
      Activity.active => 'Active',
      Activity.dormant => 'Dormant',
      Activity.unknown => 'Activity not confirmed',
    };
