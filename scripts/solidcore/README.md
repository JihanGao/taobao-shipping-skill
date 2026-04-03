# solidcore watcher

This folder contains a local watcher for checking when next month's `solidcore` classes become visible to a logged-in member account.

## Commands

- `npm run solidcore:login`: open Chrome, let you log in manually, and save the session.
- `npm run solidcore:test-notify`: send a test Pushover notification to your iPhone.
- `npm run solidcore:check`: run one detection pass and send a Pushover alert if next month is detected for the first time.
- `npm run solidcore:watch`: keep checking on the configured release days.

## Setup

1. Copy `.env.example` values into `.env`.
2. Fill in:
   - `SOLIDCORE_SCHEDULE_URL`: the member-visible schedule page you want to monitor.
   - `SOLIDCORE_TARGET_STUDIOS`: optional `|`-separated studio names, for example `Mosaic, VA|Reston, VA|Tyson's Corner, VA`
   - `SOLIDCORE_STUDIO_NAME` (optional, used in alerts)
   - `PUSHOVER_USER_KEY`
   - `PUSHOVER_APP_TOKEN`
3. Run `npm run solidcore:login` and log in in the opened Chrome window.
4. Run `npm run solidcore:test-notify` to confirm your iPhone receives alerts.
5. Run `npm run solidcore:check` once and inspect `.local/solidcore/debug/latest-result.json`.

## launchd auto-run

If you want your Mac to check automatically overnight:

1. Copy the runtime files in `scripts/solidcore/runtime/` into `~/Library/Application Support/solidcore-watcher/`.
2. Copy `scripts/solidcore/runtime/com.jihangao.solidcore-watcher.plist` to `~/Library/LaunchAgents/`.
3. Run `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.jihangao.solidcore-watcher.plist`
4. Optional: run `launchctl kickstart -k gui/$(id -u)/com.jihangao.solidcore-watcher` for an immediate test.

This agent wakes up every 5 minutes from `00:00` through `05:55` local time. The checker itself only sends alerts on configured release days, which default to the `23rd` and `24th`.

Logs:

- `.local/solidcore/logs/check.log`
- `.local/solidcore/logs/check.error.log`
- `.local/solidcore/logs/launchd.stdout.log`
- `.local/solidcore/logs/launchd.stderr.log`

## Tuning detection

The checker looks for dates belonging to next month in the visible page text.

- If it is too sensitive, increase `SOLIDCORE_REQUIRED_DATE_MATCHES`.
- If it misses the release, inspect `.local/solidcore/debug/latest-page-text.txt` and adjust the schedule URL or matcher logic.
- Every check also saves `.local/solidcore/debug/latest-schedule.png`.
- If the saved member session expires and solidcore asks you to log in or enter a code again, the watcher sends a re-login reminder.
- If `SOLIDCORE_TARGET_STUDIOS` is set, the watcher opens the studio picker and applies those studios before checking availability.
