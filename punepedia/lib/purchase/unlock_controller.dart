import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'unlock_store.dart';

enum UnlockPhase {
  /// Asking the store whether it can sell the unlock.
  checking,

  /// Ready to buy (or already unlocked).
  ready,

  /// No store on this device, or the product is not set up in the store.
  unavailable,

  /// The purchase sheet is open.
  buying,

  /// Paid with a slow method; waiting for the store to confirm.
  pending,

  /// Waiting for the store to re-deliver an earlier purchase.
  restoring,
}

/// Owns the one-time unlock: whether the full library is open, the price, and
/// buying and restoring. The unlocked flag is cached on the device so reading
/// works offline; the store re-confirms it on every start.
class UnlockController extends ChangeNotifier {
  UnlockController({required SharedPreferences prefs, UnlockStore? store, this.restoreTimeout = const Duration(seconds: 10)})
      : _prefs = prefs,
        _store = store,
        _unlocked = prefs.getBool(_kUnlocked) ?? false;

  static const _kUnlocked = 'unlocked';

  final SharedPreferences _prefs;
  final UnlockStore? _store;

  /// How long a restore waits for an earlier purchase before saying none was found.
  final Duration restoreTimeout;

  bool _unlocked;
  UnlockPhase _phase = UnlockPhase.checking;
  String? _price;
  String? _messageKey;
  StreamSubscription<UnlockEvent>? _sub;
  Timer? _restoreTimer;
  bool _disposed = false;

  bool get unlocked => _unlocked;
  UnlockPhase get phase => _phase;

  /// The store's formatted price, e.g. "₹199.00", once loaded.
  String? get price => _price;

  /// Key into the interface strings for the latest notice, if any.
  String? get messageKey => _messageKey;

  bool get busy => _phase == UnlockPhase.checking || _phase == UnlockPhase.buying || _phase == UnlockPhase.restoring;

  Future<void> start() async {
    final store = _store;
    if (store == null) {
      _set(UnlockPhase.unavailable);
      return;
    }
    _sub = store.events.listen(_onEvent);
    if (!await store.isAvailable()) {
      _set(UnlockPhase.unavailable);
      return;
    }
    _price = await store.loadPrice();
    _set(_price == null && !_unlocked ? UnlockPhase.unavailable : UnlockPhase.ready);
    // Quietly re-deliver an earlier purchase (new phone, reinstall, or a
    // pending payment that completed while the app was closed).
    if (!_unlocked) {
      try {
        await store.restore();
      } catch (_) {
        // The reader can still restore from Settings.
      }
    }
  }

  Future<void> buy() async {
    final store = _store;
    if (store == null || _unlocked || busy) return;
    _messageKey = null;
    _set(UnlockPhase.buying);
    if (!await store.buy()) {
      _messageKey = _price == null ? 'unlockUnavailable' : 'unlockFailed';
      _set(_price == null ? UnlockPhase.unavailable : UnlockPhase.ready);
    }
  }

  Future<void> restore() async {
    final store = _store;
    if (store == null || _unlocked || busy) return;
    _messageKey = null;
    _set(UnlockPhase.restoring);
    _restoreTimer?.cancel();
    _restoreTimer = Timer(restoreTimeout, () {
      if (_phase == UnlockPhase.restoring) {
        _messageKey = 'unlockRestoreNothing';
        _set(UnlockPhase.ready);
      }
    });
    try {
      await store.restore();
    } catch (_) {
      _restoreTimer?.cancel();
      _messageKey = 'unlockFailed';
      _set(UnlockPhase.ready);
    }
  }

  void _onEvent(UnlockEvent e) {
    switch (e.kind) {
      case UnlockEventKind.granted:
        _restoreTimer?.cancel();
        _unlocked = true;
        _prefs.setBool(_kUnlocked, true);
        _messageKey = 'unlockDone';
        _set(UnlockPhase.ready);
      case UnlockEventKind.pending:
        _messageKey = 'unlockPending';
        _set(UnlockPhase.pending);
      case UnlockEventKind.failed:
        _messageKey = 'unlockFailed';
        _set(UnlockPhase.ready);
      case UnlockEventKind.canceled:
        _messageKey = null;
        _set(UnlockPhase.ready);
    }
  }

  void _set(UnlockPhase phase) {
    if (_disposed) return; // a store call can finish after the app closes
    _phase = phase;
    notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _restoreTimer?.cancel();
    _sub?.cancel();
    _store?.dispose();
    super.dispose();
  }
}
