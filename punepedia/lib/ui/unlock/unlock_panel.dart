import 'package:flutter/material.dart';

import '../../l10n/strings.dart';
import '../../purchase/unlock_controller.dart';
import '../../state/app_state.dart';
import '../../theme/theme.dart';
import '../widgets/common.dart';

/// Offers the one-time unlock: price, buy, restore and the store's latest
/// notice. Shown in place of a locked story and in Settings.
class UnlockPanel extends StatelessWidget {
  const UnlockPanel({super.key, this.showIntro = true});

  /// The heading and explanation; Settings shows the buttons only.
  final bool showIntro;

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final unlock = state.unlock;
    final s = S.of(context);
    final tt = Theme.of(context).textTheme;
    final c = PPColors.of(context);
    final total = state.library.entries.where((e) => !e.isFixture).length;
    final notice = unlock.messageKey;

    if (unlock.unlocked) {
      return Text(s.t('unlockDone'), style: tt.bodyMedium?.copyWith(color: c.verified));
    }

    final buyLabel = unlock.price == null ? s.t('unlockBuyNoPrice') : s.t('unlockBuy', {'price': unlock.price!});
    final canBuy = unlock.phase == UnlockPhase.ready;
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (showIntro) ...[
            Row(children: [
              Icon(Icons.lock_outline, size: 20, color: c.saffron),
              const SizedBox(width: 8),
              Expanded(child: Text(s.t('unlockTitle'), style: tt.titleMedium)),
            ]),
            const SizedBox(height: 8),
            Text(s.t('unlockBody', {'n': total}), style: tt.bodyMedium),
            const SizedBox(height: 14),
          ],
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: canBuy ? unlock.buy : null,
              child: unlock.phase == UnlockPhase.buying || unlock.phase == UnlockPhase.checking
                  ? Text(s.t('unlockWorking'))
                  : Text(buyLabel),
            ),
          ),
          const SizedBox(height: 4),
          Center(
            child: TextButton(
              style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: unlock.phase == UnlockPhase.ready ? unlock.restore : null,
              child: Text(unlock.phase == UnlockPhase.restoring ? s.t('unlockWorking') : s.t('unlockRestore')),
            ),
          ),
          if (unlock.phase == UnlockPhase.unavailable)
            Text(s.t('unlockUnavailable'), style: tt.bodySmall?.copyWith(color: c.disputed))
          else if (notice != null)
            Semantics(
              liveRegion: true,
              child: Text(s.t(notice), style: tt.bodySmall?.copyWith(color: notice == 'unlockPending' ? c.lead : c.disputed)),
            ),
        ],
      ),
    );
  }
}
