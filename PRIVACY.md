# Lance Privacy Policy

Lance is local-first. Your business data (clients, projects, invoices, proposals, time entries, finances) lives in a SQLite database on your device and is never transmitted anywhere.

What leaves your device, and why:

- **Update check.** On launch, Lance fetches a version file from GitHub Releases. GitHub sees a normal HTTPS request (your IP, the app version in the URL). No account, no identifier, no usage data.
- **Changelog.** The "What's new" screen fetches public release notes from the GitHub API. Same as above: no identifier, no usage data.
- **License validation.** Only if you enter a Pro license key: the key is checked against our license server so paid features unlock. Keyless users send nothing.
- **Checkout.** Only if you click buy: your browser opens Paddle (our merchant of record), which handles payment, tax, and receipts under Paddle's own privacy policy.

What never happens:

- No analytics, no usage tracking, no crash reports sent anywhere.
- No advertising identifiers, no third-party trackers in the app.
- No account system. There is nothing to sign into and no server holding your data.

Because your data stays on your machine, deleting the app's data folder removes everything. Export your records first from Settings if you want a copy.
