import 'dart:async';

import 'package:in_app_purchase/in_app_purchase.dart';

/// What the store reports about the one-time unlock.
enum UnlockEventKind { granted, pending, failed, canceled }

class UnlockEvent {
  const UnlockEvent(this.kind, [this.message]);
  final UnlockEventKind kind;
  final String? message;
}

/// Where the one-time unlock is bought and restored. The app talks to this
/// interface only, so tests and non-Android builds can supply their own.
abstract class UnlockStore {
  /// Purchase results, including ones that finish while the app was closed.
  Stream<UnlockEvent> get events;

  Future<bool> isAvailable();

  /// The unlock's price as the store formats it (e.g. "₹199.00"), or null if
  /// the product cannot be loaded (not yet created in Play Console, offline).
  Future<String?> loadPrice();

  /// Opens the store's purchase sheet. The outcome arrives on [events].
  /// Returns false if the purchase could not be started.
  Future<bool> buy();

  /// Asks the store to re-deliver earlier purchases on [events].
  Future<void> restore();

  void dispose();
}

/// Google Play Billing, through the in_app_purchase plugin. The unlock is a
/// one-time (non-consumable) in-app product whose ID is set in AppConfig and
/// must match the product created in Play Console.
class PlayUnlockStore implements UnlockStore {
  PlayUnlockStore({required this.productId, InAppPurchase? iap})
      : _iap = iap ?? InAppPurchase.instance;

  final String productId;
  final InAppPurchase _iap;
  final StreamController<UnlockEvent> _events = StreamController.broadcast();
  StreamSubscription<List<PurchaseDetails>>? _sub;
  ProductDetails? _product;

  @override
  Stream<UnlockEvent> get events {
    _sub ??= _iap.purchaseStream.listen(
      _onPurchases,
      onError: (Object e) => _events.add(UnlockEvent(UnlockEventKind.failed, '$e')),
    );
    return _events.stream;
  }

  Future<void> _onPurchases(List<PurchaseDetails> purchases) async {
    for (final p in purchases) {
      if (p.productID != productId) continue;
      // Acknowledge first: Play refunds purchases left unacknowledged for
      // three days. A failed acknowledgement is retried on the next restore.
      if (p.pendingCompletePurchase) {
        try {
          await _iap.completePurchase(p);
        } catch (_) {}
      }
      _events.add(switch (p.status) {
        PurchaseStatus.purchased || PurchaseStatus.restored => const UnlockEvent(UnlockEventKind.granted),
        PurchaseStatus.pending => const UnlockEvent(UnlockEventKind.pending),
        PurchaseStatus.canceled => const UnlockEvent(UnlockEventKind.canceled),
        PurchaseStatus.error => UnlockEvent(UnlockEventKind.failed, p.error?.message),
      });
    }
  }

  @override
  Future<bool> isAvailable() => _iap.isAvailable();

  @override
  Future<String?> loadPrice() async {
    try {
      final response = await _iap.queryProductDetails({productId});
      if (response.productDetails.isEmpty) return null;
      _product = response.productDetails.first;
      return _product!.price;
    } catch (_) {
      return null;
    }
  }

  @override
  Future<bool> buy() async {
    if (_product == null) await loadPrice();
    final product = _product;
    if (product == null) return false;
    try {
      return await _iap.buyNonConsumable(purchaseParam: PurchaseParam(productDetails: product));
    } catch (_) {
      return false;
    }
  }

  @override
  Future<void> restore() => _iap.restorePurchases();

  @override
  void dispose() {
    _sub?.cancel();
    _events.close();
  }
}
