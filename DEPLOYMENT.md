# Vercel payment and delivery setup

Set these **server-side** environment variables in Vercel for each deployment environment:

| Setting | Purpose |
| --- | --- |
| `APP_URL` | Public HTTPS storefront URL. Easebuzz callbacks and email links use this origin. |
| `FIREBASE_DATABASE_URL` | Firebase Realtime Database URL. |
| `FIREBASE_DATABASE_AUTH` (or `FIREBASE_DATABASE_SECRET`) | Existing private Firebase Realtime Database REST credential. It must keep working after database rules are locked. A short-lived user ID token is unsuitable for a permanent Vercel server. No Firebase Admin SDK is installed. |
| `EASEBUZZ_KEY`, `EASEBUZZ_SALT` | Credentials for the selected Easebuzz environment. |
| `EASEBUZZ_ENV` | `test` for test credentials, `prod` for live credentials. Set this explicitly for each Vercel environment. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Resend key and a sender on a verified domain. Needed for purchase email. |
| `CRON_SECRET` | Private secret used by Vercel Cron to authenticate the daily recovery request. |
| `PRODUCT_DOWNLOAD_URL_<PRODUCT_ID>` | Private HTTPS or complete MEGA ZIP source for each sold product; replace punctuation in the ID with `_` and uppercase it. |

Use separate Easebuzz test and live keys. A successful test transaction cannot be retrieved with live credentials, and vice versa. Redeploy after changing Vercel environment variables. If `EASEBUZZ_ENV` is omitted, the application keeps its original `test` default. The scheduled recovery runs once daily at 03:00 UTC, which also fits Vercel Hobby plans. Signed payment responses are processed immediately; the browser's automatic transaction lookup and cron cover missing callbacks or temporary database and email errors.

For an additional server notification, configure Easebuzz to POST its **signed payment-response fields** to `https://<your-app-domain>/api/payments/easebuzz/webhook` in the corresponding test or live dashboard. Keep the existing `surl` and `furl` callback URL configured by the application. The webhook and callback both validate Easebuzz's reverse SHA-512 hash, merchant key, transaction ID, amount, email, and stored product info. A signed success immediately records payment and delivers the order; neither route waits for the transaction lookup. Unsigned or differently formatted notifications are rejected. Confirm that the selected Easebuzz dashboard webhook actually sends this signed response format before enabling it. Its live webhook payload and retry policy could not be verified from the public Node kit; the callback and browser lookup work independently of that configuration.

The checkout shows **Payment Successful** once the server order is confirmed paid, even while file delivery or email is still being prepared. It shows **Payment Pending** when Easebuzz has not confirmed an outcome and **Payment Failed** for a signed failure report or a verified failed transaction. A browser return alone never grants downloads. Hosted checkout uses `surl`/`furl`; the popup's signed `onResponse` is also submitted to the server. Callback, popup response, webhook and transaction lookup share the same paid-order completion logic. Deterministic purchase/download IDs and a Resend idempotency key avoid duplicate delivery when notifications overlap.

The gateway initiation request retains the previous minimal format: first name, account email, Indian mobile number and generic `FFDigital Products` description. UDF fields remain empty to preserve the existing Easebuzz payload. The order stores the buyer's full name, phone, India country, purchased items, original checkout time, payment initiation time and IP, terms acceptance time and policies, and request ID in Firebase. These extra details are **not** sent to Easebuzz; the gateway's own checkout address/location fields are controlled by Easebuzz. Client IP depends on Vercel's forwarded client IP header and can be absent if no valid IP is available.

Password recovery uses the registered email and mobile number directly, with no emailed code. This is the requested older flow; anyone who knows both values can attempt a reset, so protect account contact details and monitor reset attempts. Purchase confirmation emails still require Resend.

## Lock Firebase rules before taking more payments

The live database was found readable without authentication on 2026-09-24: anonymous shallow reads of `users` and `orders` both returned existing record keys. Do not use open rules for this server. The repository includes [database.rules.json](database.rules.json), which denies all direct client reads and writes. Before applying those rules, confirm that the existing `FIREBASE_DATABASE_AUTH` or `FIREBASE_DATABASE_SECRET` is a privileged REST credential that can still read and write with closed rules. Then apply the rules in the **Firebase Realtime Database Rules** tab. This repository does not deploy Firebase rules automatically.

After applying rules, an unauthenticated request to `users.json` and `orders.json` must be denied. Then check `/api/firebase-status` and create a synthetic account/order in a safe test environment to confirm Vercel can still write. Never paste the service account JSON, database secret or customer records into a support chat or commit.

## What Firebase stores

An order is written atomically to `orders/<orderId>` and `users/<userId>/orders/<orderId>`. Once payment starts, the same write also saves `paymentTxnIndex/<txnid>` so callbacks and webhooks can find it without scanning all orders. Older orders still use the original lookup fallback. After Easebuzz confirms the transaction ID and amount, the order receives `paymentVerifiedAt` and an immutable `invoiceNumber` (`INV-<orderId>`). Fulfillment creates mirrored `purchases` records and account download records, then adds `fulfilledAt` and `deliveredAt`. Purchase email attempts and Resend's accepted message ID are in `order.emailDelivery`. Audit entries have their own timestamp in `auditLogs`, `orderAuditIndex`, and user activity. Email links and download tokens are stored in Firebase with expiry and usage metadata. The invoice PDF is generated from the paid order; its number and payment time come from that record.

The customer's delivery email is their registered account email. The account page retains downloads and offers an authenticated invoice PDF when email delivery is delayed. Profile changes and newsletter subscriptions are also saved through server routes into Firebase. Resend accepting an email does not prove it reached the inbox; check the Resend delivery events and the recipient's spam folder if the order records `emailDelivery.status: sent` but no message arrives.

After successful payment and delivery, the purchase email contains the order number and paid date, purchased product names and amounts, total, expiring private download links, a private invoice link, account link, and support/policy links. It attaches the PDF invoice/receipt. The email does not include the customer's IP or terms consent record; those stay in Firebase for the order audit. `emailDelivery.status: sent` means Resend accepted the request, not that the recipient opened the message.

## Verification after deployment

1. Confirm `/api/firebase-status` reports `connected: true` on the deployed site. This is a connectivity check, not a complete data audit. Verify the server's REST credential can read and write after rules are closed.
2. Make a small Easebuzz **test** purchase on a Preview deployment configured with `EASEBUZZ_ENV=test`. Check the order in Firebase for `paymentStatus: PAID`, `paymentVerifiedAt`, `invoiceNumber`, `deliveryStatus: DELIVERED`, `fulfilledAt`, `deliveredAt`, `emailDelivery`, its purchase record, and its audit timeline.
3. Check Resend for the order's `emailId`. Open the invoice and a download link. Check that the download requires a paid, delivered order.
4. Only after the test path passes, repeat a small live purchase with `EASEBUZZ_ENV=prod` and live credentials on Production. Do not use a test transaction to validate live mode.

Never put the Firebase credential, Easebuzz salt, Resend key, private product URL or cron secret in `VITE_` variables or browser code.
