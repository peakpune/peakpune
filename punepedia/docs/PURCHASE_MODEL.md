# Purchase model

**Free download with a one-time in-app unlock** (`AppConfig.purchaseModel = PurchaseModel.freeWithUnlock`). Price: **₹199**, set on the product in Play Console. There is no subscription and no ads.

## What is free and what is locked

| Free for everyone | Needs the unlock |
|---|---|
| Browsing everything: Discover, Timeline, Explore, search, Saved | The full story of each entry |
| Title, date, status and summary of every entry | Its sources, citations and location |
| The full text of the **free sample** entries | |

Free samples are the entries with `"freeSample": true` in `content/entries/*.json` (currently 5: the featured Ganeshotsav story, Shaniwar Wada, Aga Khan Palace, the 1848 girls' school and *wada*). Change the set by editing those flags; no code changes are needed. `release-check` fails if no entry is a free sample.

## How it works

- `lib/purchase/unlock_store.dart` talks to Google Play Billing through the `in_app_purchase` plugin. It is the only code that knows about Play.
- `lib/purchase/unlock_controller.dart` keeps the unlocked flag (cached on the device so reading works offline), loads the price from Play, and handles buy, pending payments and restore.
- On every start the app quietly asks Play to re-deliver earlier purchases, so a reinstall or a new phone unlocks automatically. Settings › Full library also has **Restore purchase**.
- Purchases are acknowledged as soon as Play reports them. Play refunds purchases that are not acknowledged within three days.
- There is no server. Purchase tokens are not verified server-side; for a ₹199 one-time unlock this is a deliberate trade-off. A refunded purchase stays unlocked on a device that already cached it.

## Play Console setup (do this before testing a purchase)

1. Upload a signed build (`app-release.aab`) to a testing track. Play only lets you create in-app products after a build that includes the billing library has been uploaded.
2. **Monetize › Products › In-app products › Create product.**
   - Product ID: `punepedia_full_unlock` (must match `AppConfig.unlockProductId` exactly; it can never be reused once created).
   - Name and description: e.g. "PunePedia full library", "Unlock every entry, its sources and locations."
   - Price: ₹199. Activate the product.
3. Add your Google account under **Settings › License testing** so test purchases are free.
4. Install the build from the testing track (not by sideloading) and buy the unlock; then uninstall, reinstall and check that it restores.

Until the product exists, the app shows "Purchases aren't available right now" and the unlock button stays disabled.
