# Lance Privacy Policy

Lance does not collect, transmit, or store any data outside your device.

- No analytics
- No crash reporting transmitted anywhere
- No usage tracking
- No license key verification servers
- No update servers receive any identifying information
- SQLite database stays on your machine

The auto-updater checks a version endpoint with no identifying payload.
The only outbound request Lance ever makes is: GET /releases/{platform}/{arch}/{version}
This reveals your platform and current version. Nothing else.
