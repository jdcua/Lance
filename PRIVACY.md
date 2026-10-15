# Lance Privacy Policy

Lance is local-first. Your business data (clients, projects, invoices, proposals, time entries, finances) lives in a SQLite database on your device and is never transmitted anywhere.

What leaves your device, and why:

- **Update check.** On launch, Lance asks our Cloudflare worker for the latest version; the worker fetches GitHub Releases with a server token, so GitHub sees the worker — not you. No account, no identifier, no usage data.
- **Changelog.** The "What's new" screen fetches public release notes through the same worker. Same as above: no identifier, no usage data.
- **License validation.** Only if you enter a Pro license key: the key, its tier, purchaser email (from Paddle), transaction/subscription IDs, issue date and revoked flag are checked against our license server so paid features unlock and refunds/revoked keys downgrade. Keyless users send nothing.
- **Checkout.** Only if you click buy: your browser opens Paddle (our merchant of record), which handles payment, tax, and receipts under Paddle's own privacy policy.
- **Fonts and site assets.** None — typefaces ship inside the app and the website. No font CDN, no third-party requests for typography.
- **Contact, waitlist, bug reports (website only).** The contact form is delivered via Resend; the v2 waitlist is opt-in; bug reports you choose to send are stored as private GitHub issues labeled `user-report`. Contact and bug messages are kept up to 30 days after resolution; waitlist addresses until v2 ships or you ask to be removed.

What never happens:

- No analytics, no usage tracking, no crash reports sent anywhere. The on-device activity log (counts that power personal stats and nudges) never leaves your machine and can be inspected and cleared in Settings → Data.
- No advertising identifiers, no third-party trackers in the app.
- No account system. There is nothing to sign into and no server holding your data.

Because your data stays on your machine, deleting the app's data folder removes everything. Export your records first from Settings if you want a copy.
