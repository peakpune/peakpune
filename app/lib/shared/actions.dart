import 'package:add_2_calendar/add_2_calendar.dart';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/honesty.dart';
import '../data/models.dart';
import '../theme/tokens.dart';

void _say(BuildContext context, String message) {
  ScaffoldMessenger.maybeOf(context)
    ?..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

/// Opens a link in the browser or the app that handles it. The app itself never
/// goes online; if nothing can open the link, it says so instead of failing quietly.
Future<void> openLink(BuildContext context, String url) async {
  final uri = Uri.tryParse(url);
  var ok = false;
  if (uri != null && (uri.scheme == 'https' || uri.scheme == 'http' || uri.scheme == 'geo')) {
    try {
      ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      ok = false;
    }
  }
  if (!ok && context.mounted) _say(context, "Couldn't open that link. It needs a browser and an internet connection.");
}

/// A Google Maps link: coordinates when the data has them (from OpenStreetMap),
/// otherwise the name and address as a search. Free, no key, opens the maps app.
String? mapUrl({required String name, double? lat, double? lon, String? address}) {
  if (lat != null && lon != null) {
    return 'https://www.google.com/maps/search/?api=1&query=${lat.toStringAsFixed(6)},${lon.toStringAsFixed(6)}';
  }
  if (address != null) return 'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent('$name, $address')}';
  return null;
}

/// Share sheet text: the entry plus its peakpune.com link.
String shareText({required String title, String? line, required String url}) =>
    [title, if (line != null && line.isNotEmpty) line, 'On Peak Pune: $url'].join('\n');

Future<void> shareEntry(BuildContext context, {required String title, String? line, required String url}) async {
  final box = context.findRenderObject() as RenderBox?;
  await SharePlus.instance.share(ShareParams(
    text: shareText(title: title, line: line, url: url),
    subject: title,
    sharePositionOrigin: box == null ? null : box.localToGlobal(Offset.zero) & box.size,
  ));
}

/// Hands a dated listing to the phone's calendar app. No calendar permission:
/// the calendar app shows the entry and the reader saves it.
Future<void> addToCalendar(BuildContext context, EventListing e) async {
  final slot = calendarSlot(e);
  if (slot == null) return;
  final event = Event(
    title: e.name,
    description: [e.summary, if (e.urlDeep != null) 'Details: ${e.urlDeep}', calendarNote(e)].join('\n\n'),
    location: e.address ?? (e.neighbourhood != null ? '${e.neighbourhood}, Pune' : 'Pune'),
    startDate: slot.timed ? slot.start.toLocal() : slot.start,
    endDate: slot.timed ? slot.end.toLocal() : slot.end.subtract(const Duration(days: 1)),
    allDay: !slot.timed,
    timeZone: slot.timed ? 'Asia/Kolkata' : null,
  );
  var ok = false;
  try {
    ok = await Add2Calendar.addEvent2Cal(event);
  } catch (_) {
    ok = false;
  }
  if (!ok && context.mounted) _say(context, 'No calendar app took the event. Copy the date from the listing instead.');
}

/// The site link for sections without their own page yet.
const homeUrl = PP.siteUrl;
