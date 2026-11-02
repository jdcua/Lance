# Privacy policy corrections annex (DRAFT - DO NOT PUBLISH)

Companion to tmp-termly-privacy-policy.md (raw Termly preview, unmodified).
Each item below is a contradiction, blank, or unverified answer with corrected
language ready to paste into Termly or the site privacy page.
Placeholders in [BRACKETS] need real values before publishing.

## 1. Blanks and known values

| Field | Value |
| --- | --- |
| Trade name (DBA) | Lance |
| Legal name | [YOUR LEGAL NAME - required] |
| Privacy contact email | [SUPPORT INBOX - required] |
| Contact form URL | https://lance.cuajuandiego.workers.dev/#contact |
| Country | Canada (Alberta) |
| Street address | [REQUIRED by builder - sole proprietors often use a mailing address] |
| Server locations | Canada, United States (Cloudflare edge network) |
| Third-party countries | United States (Resend, Paddle, Cloudflare, GitHub) |
| Transfer safeguard | EU Standard Contractual Clauses |
| Payment vendor | Paddle - https://www.paddle.com/legal/privacy |
| Retention | Support and bug messages up to 30 days after resolution. Launch
waitlist addresses until launch or opt-out. |
| Effective date | 10/05/2026 |

## 2. Contradictions with corrected language

### 2a. Social logins (builder section 5 - DELETE)
Builder says the Services offer social login. False. No accounts exist at all.
Replacement: omit the section entirely. If Termly forces it, replace with:
"Lance has no user accounts. There is nothing to sign into, including with
third-party credentials."

### 2b. Advertising and analytics cookies (section 4 - REWRITE)
Builder permits third-party analytics and advertising cookies. False.
Replacement: "We use one first-party cookie (lance_ab_hero-cta, 30 days) to
remember which download-button variant was shown, plus anonymous aggregate
view and click counts with no IP storage and no fingerprinting. We use no
third-party analytics, no advertising cookies, and no crash reporting."

### 2c. Affiliates and business partners (section 3 - DELETE)
Builder shares data with affiliates and business partners. False. Sole
proprietor, no affiliates, no partners.
Replacement: omit both paragraphs. Keep only the business-transfer paragraph.

### 2d. Account language (sections 1, 9 - REWRITE)
Builder mentions registering and terminating accounts. False.
Replacement: "Lance has no accounts. To exercise privacy rights, email
[SUPPORT INBOX] from the address you originally used."

### 2e. Indirect sources boilerplate (summary - REWRITE)
Builder lists public databases and marketing partners. False.
Replacement: "The only personal information we obtain indirectly is the
purchaser email address provided by our payment processor, Paddle, at the
time of purchase, used solely to deliver the license key."

### 2f. Automatic collection (section 1 - REWRITE)
Builder claims internal analytics and broad device profiling. Overstated.
Replacement: "We automatically receive only standard connection data (such as
IP address) needed to operate and protect the service. IP addresses are used
solely for short-lived in-memory abuse limits and are never written to
storage. Our hosting provider necessarily observes connection data as any host
does."

## 3. Local-first clause (entered in builder, missing from preview - VERIFY)

"Lance is a local-first application. Business records created in the app
(clients, projects, proposals, contracts, time entries, invoices, and
finances) are stored in a database on the user device and are not transmitted
to us. The app contacts our servers only in these cases: (1) update checks
and downloads, which run through our own Cloudflare worker that fetches
release files from GitHub, so GitHub does not observe user IP addresses
directly; (2) license validation, which occurs only if the user enters a Pro
license key, and transmits only the key. Our license server stores the key,
its tier, the purchaser email received from our payment processor, transaction
and subscription identifiers, the issue date, and a revoked flag. It stores
no device identifiers. Support and bug report messages are kept up to 30 days
after resolution. Launch waitlist addresses are kept until launch or opt-out.
IP addresses are used only for short-lived in-memory abuse limits and are
never written to storage."

## 4. Unverified builder answers (revisit in Termly sidebar)

US Considerations sub-steps that advanced without explicit answers:
Consumer Data (expect Yes - Paddle purchases), Biometric (No), Internet
Activity (No - aggregate only, no user-level linkage), Geolocation (No),
Sensory (No), Professional (No). Education and Inferences are confirmed No.
