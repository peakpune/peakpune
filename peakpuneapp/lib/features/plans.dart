import 'package:flutter/material.dart';

import '../data/honesty.dart';
import '../data/models.dart';
import '../shared/actions.dart';
import '../shared/detail.dart';
import '../state/app_state.dart';
import '../theme/tokens.dart';
import '../theme/widgets.dart';
import 'explore.dart';

/// Events and meetups, as two tabs.
class PlansScreen extends StatelessWidget {
  const PlansScreen({super.key});

  @override
  Widget build(BuildContext context) => DefaultTabController(
        length: 2,
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(PP.s4, PP.s6, PP.s4, PP.s3),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Eyebrow('Plans'),
              const SizedBox(height: PP.s2),
              Semantics(header: true, child: Text('Events and meetups', style: Theme.of(context).textTheme.headlineMedium)),
            ]),
          ),
          const PillTabs(tabs: ['Events', 'Meetups']),
          const Expanded(child: TabBarView(children: [EventsList(key: PageStorageKey('events')), MeetupsList(key: PageStorageKey('meetups'))])),
        ]),
      );
}

class EventsList extends StatelessWidget {
  const EventsList({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final live = currentEvents(state.library.events, state.now());
    final dated = live.where((e) => !e.isRecurring).toList();
    final recurring = live.where((e) => e.isRecurring).toList();
    return ListView(
      padding: const EdgeInsets.fromLTRB(PP.s4, PP.s4, PP.s4, PP.s12),
      children: [
        Text('Source-listed plans, read on ${longDate(state.library.auditCheckedAt)}. Dated listings disappear once the day has passed. Check dates and prices before you book.',
            style: Theme.of(context).textTheme.bodySmall),
        if (dated.isEmpty)
          EmptyState(
            icon: Icons.event_busy,
            title: 'Nothing dated right now.',
            message: 'The calendar is resting, as Pune does after lunch. Try a meetup, or head out on a loop.',
            actions: [DetailAction('Go outdoors', Icons.terrain, () => state.goTab(2), primary: true)],
          )
        else ...[
          const SizedBox(height: PP.s4),
          for (final e in dated) Padding(padding: const EdgeInsets.only(bottom: PP.s4), child: EventCard(e: e)),
        ],
        if (recurring.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.only(top: PP.s6, bottom: PP.s2),
            child: Semantics(header: true, child: Text('Recurring at venues', style: Theme.of(context).textTheme.headlineSmall)),
          ),
          Padding(padding: const EdgeInsets.only(bottom: PP.s4), child: Text('Schedules published by the venue. Confirm current timings before going.', style: Theme.of(context).textTheme.bodySmall)),
          for (final e in recurring) Padding(padding: const EdgeInsets.only(bottom: PP.s4), child: EventCard(e: e)),
        ],
      ],
    );
  }
}

String eventWhen(EventListing e) {
  if (e.isRecurring) return 'Recurring';
  final day = eventDay(e.startDate!);
  return e.start != null ? '$day · ${puneTime(e.start!)}' : day;
}

class EventCard extends StatelessWidget {
  const EventCard({super.key, required this.e});
  final EventListing e;

  @override
  Widget build(BuildContext context) => EntryCard(
        eyebrow: eventWhen(e),
        title: e.name,
        summary: e.summary,
        meta: [
          MetaText([e.organiser, e.neighbourhood].whereType<String>().join(' · ')),
          TagPill(priceText(e.priceNote), color: e.priceNote == null ? PP.paper : PP.sage),
        ],
        footer: e.recurrence,
        onTap: () => openPage(context, EventDetail(e: e)),
      );
}

class EventDetail extends StatelessWidget {
  const EventDetail({super.key, required this.e});
  final EventListing e;

  @override
  Widget build(BuildContext context) {
    final lib = AppScope.of(context).library;
    final venue = e.linkedId == null ? null : lib.place(e.linkedId!);
    final canCal = calendarSlot(e) != null;
    return DetailPage(
      eyebrow: e.isRecurring ? 'Recurring listing' : 'Event',
      title: e.name,
      summary: e.summary,
      sources: e.sources,
      checkedAt: e.checkedAt,
      shareUrl: e.webUrl,
      shareLine: [eventWhen(e), e.neighbourhood].whereType<String>().join(' · '),
      badges: [
        TagPill(eventWhen(e), color: PP.haldi),
        if (e.status == Verification.partial) const LevelBadge('Partial listing', fill: PP.paper),
      ],
      flags: [
        if (e.status == Verification.partial) 'Partial listing: some details are not confirmed on the source page.',
        if (e.eventStatus == null && !e.isRecurring) 'The source does not confirm the current status of this event.',
        if (e.sourceStale) 'The source for this listing is more than 90 days old. Check with the organiser before you go.',
      ],
      actions: [
        if (canCal) DetailAction('Add to calendar', Icons.event_available, () => addToCalendar(context, e), primary: true),
        if (e.urlDeep case final url?) DetailAction(e.status == Verification.verified ? 'Organiser page' : 'Source page', Icons.north_east, () => openLink(context, url)),
        if (e.ticketUrl case final url? when url != e.urlDeep) DetailAction('Tickets', Icons.confirmation_number_outlined, () => openLink(context, url)),
        if (venue != null) DetailAction('About the venue', Icons.place_outlined, () => openPage(context, PlaceDetail(place: venue))),
      ],
      facts: [
        Fact('When', e.isRecurring ? (e.recurrence ?? 'Recurring') : eventWhen(e)),
        if (e.end != null) Fact('Ends', '${eventDay(e.endRaw!.substring(0, 10))} · ${puneTime(e.end!)}'),
        Fact('Where', e.address ?? e.neighbourhood ?? 'Pune'),
        if (e.organiser != null) Fact('Organiser', e.organiser!),
        Fact('Price', priceText(e.priceNote)),
        if (e.notes != null) Fact('Note', e.notes!),
      ],
      tags: e.tags.map(tagLabel).toList(),
      provenance: canCal
          ? 'Calendar entries use an exact time only where the source gives one; otherwise they are all-day. No end time is guessed.'
          : null,
    );
  }
}

class MeetupsList extends StatelessWidget {
  const MeetupsList({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final rows = state.library.meetups;
    if (rows.isEmpty) {
      return EmptyState(
        icon: Icons.groups_outlined,
        title: 'No communities listed yet.',
        message: 'Joining links and activity need checking before they appear. Meanwhile, the hills do not need an invite.',
        actions: [DetailAction('Go outdoors', Icons.terrain, () => state.goTab(2), primary: true)],
      );
    }
    final live = rows.where((m) => m.activity == Activity.active).toList();
    final rest = rows.where((m) => m.activity != Activity.active).toList();
    return ListView(
      padding: const EdgeInsets.fromLTRB(PP.s4, PP.s4, PP.s4, PP.s12),
      children: [
        Text('${live.length} Pune groups with a public joining page and dated activity, read on ${longDate(state.library.auditCheckedAt)}. Rules, costs and group links live on their own sites.',
            style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: PP.s4),
        for (final m in [...live, ...rest]) Padding(padding: const EdgeInsets.only(bottom: PP.s4), child: MeetupCard(m: m)),
      ],
    );
  }
}

Widget activityBadge(Activity a) => LevelBadge(activityLabel(a), fill: switch (a) {
      Activity.active => PP.sage,
      Activity.dormant => PP.brick,
      Activity.unknown => PP.paper,
    });

class MeetupCard extends StatelessWidget {
  const MeetupCard({super.key, required this.m});
  final Meetup m;

  @override
  Widget build(BuildContext context) => EntryCard(
        eyebrow: [...m.tags.take(2).map(tagLabel), ?m.neighbourhood].join(' · '),
        title: m.name,
        summary: m.summary,
        meta: [activityBadge(m.activity), MetaText(costText(m.costNote))],
        footer: m.scheduleText,
        onTap: () => openPage(context, MeetupDetail(m: m)),
      );
}

class MeetupDetail extends StatelessWidget {
  const MeetupDetail({super.key, required this.m});
  final Meetup m;

  @override
  Widget build(BuildContext context) {
    final lib = AppScope.of(context).library;
    final venue = m.linkedId == null ? null : lib.place(m.linkedId!);
    return DetailPage(
      eyebrow: 'Community',
      title: m.name,
      summary: m.summary,
      sources: m.sources,
      checkedAt: m.checkedAt,
      shareUrl: m.webUrl,
      shareLine: m.scheduleText,
      badges: [activityBadge(m.activity)],
      flags: [if (m.sourceStale) 'The source for this listing is more than 90 days old. Check the group\'s page before you go.'],
      actions: [
        if (m.joinUrl case final url?) DetailAction('How to join', Icons.group_add_outlined, () => openLink(context, url), primary: true),
        if (venue != null) DetailAction('About the venue', Icons.place_outlined, () => openPage(context, PlaceDetail(place: venue))),
      ],
      facts: [
        Fact('Schedule', m.scheduleText ?? 'Not published'),
        Fact('Cost', costText(m.costNote)),
        Fact('Last public activity', m.lastPublicActivity == null ? 'Not found on the source' : longDateIso(m.lastPublicActivity!)),
        if (m.neighbourhood != null) Fact('Area', m.neighbourhood!),
        if (m.notes != null) Fact('Note', m.notes!),
      ],
      tags: m.tags.map(tagLabel).toList(),
      provenance: '"Active" means a dated public activity within 90 days or an upcoming dated session. Member counts, if any, are the group\'s own figures.',
    );
  }
}
