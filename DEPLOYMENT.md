# Vercel payment and delivery setup

Set these **server-side** environment variables in Vercel for each deployment environment:

| Setting | Purpose |
| --- | --- |
| `APP_URL` | Public HTTPS storefront URL. Easebuzz callbacks and email links use this origin. |
| `FIREBASE_DATABASE_URL` | Firebase Realtime Database URL. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Preferred: full service account JSON for the Firebase Admin SDK. Store it only in Vercel server-side settings. |
| `FIREBASE_DATABASE_AUTH` (or `FIREBASE_DATABASE_SECRET`) | Existing REST credential remains supported. It must keep working after database rules are locked. A short-lived user ID token is unsuitable for a permanent Vercel server. |
| `EASEBUZZ_KEY`, `EASEBUZZ_SALT` | Credentials for the selected Easebuzz environment. |
| `EASEBUZZ_ENV` | `test` for test credentials, `prod` for live credentials. Set this explicitly for each Vercel environment. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Resend key and a sender on a verified domain. Needed for purchase email. |
| `CRON_SECRET` | Private secret used by Vercel Cron to authenticate the daily recovery request. |
| `PRODUCT_DOWNLOAD_URL_<PRODUCT_ID>` | Private HTTPS or complete MEGA ZIP source for each sold product; replace punctuation in the ID with `_` and uppercase it. |

Use separate Easebuzz test and live keys. A successful test transaction cannot be retrieved with live credentials, and vice versa. Redeploy after changing Vercel environment variables. The scheduled recovery runs once daily at 03:00 UTC, which also fits Vercel Hobby plans. The browser and Easebuzz callback attempt immediate reconciliation; the cron is a fallback for interrupted callbacks, database outages and email retries.

For an additional server notification, configure Easebuzz to POST its **signed payment-response fields** to `https://<your-app-domain>/api/payments/easebuzz/webhook` in the corresponding test or live dashboard. Keep the existing `surl` and `furl` callback URL configured by the application. The webhook accepts the same reverse SHA-512 response hash as the existing callback, requires the configured merchant key and exact order transaction ID and amount, then retrieves the payment from Easebuzz before fulfillment. Unsigned or differently formatted notifications are rejected; confirm the payload format with Easebuzz before enabling a dashboard webhook. The endpoint returns an error while retrieval is unavailable so the notification can be retried, while the browser and cron reconciliation remain available.

The checkout shows **Payment Successful** once the server order is confirmed paid, even while file delivery or email is still being prepared. It shows **Payment Pending** when Easebuzz has not confirmed an outcome and **Payment Failed** for a signed failure report or a verified failed transaction. A browser return alone never grants downloads. Callback, webhook, the buyer's status check, and the daily cron all call the same reconciliation path; deterministic purchase/download IDs and a Resend idempotency key avoid duplicate delivery when notifications overlap.

Easebuzz's initiation request includes the customer's name, registered email, Indian mobile number, product titles, and the following merchant metadata: UDF1 order ID, UDF2 `India`, UDF3 payment initiation time (UTC), UDF4 client IP when available, UDF5 consent time (UTC), UDF6 product IDs, and UDF7 the terms/refund/privacy acceptance marker. UDF8–UDF10 remain empty so the sent form and Easebuzz hash agree. The gateway's own checkout address/location fields are controlled by Easebuzz; this application passes only the country as merchant metadata. The order separately stores the original checkout time, initiation time and IP, consent time and policies, product details, and request ID in Firebase. Client IP depends on Vercel's forwarded client IP header and can be absent if no valid IP is available.

Password recovery uses the registered email and mobile number directly, with no emailed code. This is the requested older flow; anyone who knows both values can attempt a reset, so protect account contact details and monitor reset attempts. Purchase confirmation emails still require Resend.

## Lock Firebase rules before taking more payments

The live database was found readable without authentication on 2026-09-24: anonymous shallow reads of `users` and `orders` both returned existing record keys. Do not use open rules for this server. The repository includes [database.rules.json](database.rules.json), which denies all direct client reads and writes. The Vercel backend should use `FIREBASE_SERVICE_ACCOUNT_JSON` so Firebase Admin SDK can read and write despite those rules. Confirm the service account belongs to the same Firebase project and database URL, then apply the rules in the **Firebase Realtime Database Rules** tab. This repository does not deploy Firebase rules automatically.

After applying rules, an unauthenticated request to `users.json` and `orders.json` must be denied. Then check `/api/firebase-status` and create a synthetic account/order in a safe test environment to confirm Vercel can still write. Never paste the service account JSON, database secret or customer records into a support chat or commit.

## What Firebase stores

An order is written atomically to `orders/<orderId>` and `users/<userId>/orders/<orderId>`. Once payment starts, the same write also saves `paymentTxnIndex/<txnid>` so callbacks and webhooks can find it without scanning all orders. Older orders still use the original lookup fallback. After Easebuzz confirms the transaction ID and amount, the order receives `paymentVerifiedAt` and an immutable `invoiceNumber` (`INV-<orderId>`). Fulfillment creates mirrored `purchases` records and account download records, then adds `fulfilledAt` and `deliveredAt`. Purchase email attempts and Resend's accepted message ID are in `order.emailDelivery`. Audit entries have their own timestamp in `auditLogs`, `orderAuditIndex`, and user activity. Email links and download tokens are stored in Firebase with expiry and usage metadata. The invoice PDF is generated from the paid order; its number and payment time come from that record.

The customer's delivery email is their registered account email. The account page retains downloads and offers an authenticated invoice PDF when email delivery is delayed. Profile changes and newsletter subscriptions are also saved through server routes into Firebase. Resend accepting an email does not prove it reached the inbox; check the Resend delivery events and the recipient's spam folder if the order records `emailDelivery.status: sent` but no message arrives.

After successful payment and delivery, the purchase email contains the order number and paid date, purchased product names and amounts, total, expiring private download links, a private invoice link, account link, and support/policy links. It attaches the PDF invoice/receipt. The email does not include the customer's IP or terms consent record; those stay in Firebase for the order audit. `emailDelivery.status: sent` means Resend accepted the request, not that the recipient opened the message.

## Verification after deployment

1. Confirm `/api/firebase-status` reports `connected: true` on the deployed site. This is a connectivity check, not a complete data audit.
2. Make a small Easebuzz **test** purchase on a Preview deployment configured with `EASEBUZZ_ENV=test`. Check the order in Firebase for `paymentStatus: PAID`, `paymentVerifiedAt`, `invoiceNumber`, `deliveryStatus: DELIVERED`, `fulfilledAt`, `deliveredAt`, `emailDelivery`, its purchase record, and its audit timeline.
3. Check Resend for the order's `emailId`. Open the invoice and a download link. Check that the download requires a paid, delivered order.
4. Only after the test path passes, repeat a small live purchase with `EASEBUZZ_ENV=prod` and live credentials on Production. Do not use a test transaction to validate live mode.

Never put the Firebase credential, Easebuzz salt, Resend key, private product URL or cron secret in `VITE_` variables or browser code.
