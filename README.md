# GrammarLoop

GrammarLoop is a local-first MVP for saving language-learning mistakes and generating AI grammar explanations.

## Stack

- Next.js App Router
- TypeScript
- SQLite
- Prisma
- OpenAI API with local mock fallback
- Tailwind CSS

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env
```

Optional: edit `.env` to choose the OpenAI defaults:

```env
OPENAI_MODEL_DEFAULT="gpt-5-mini"
OPENAI_MODEL_HIGH_QUALITY="gpt-5.4"
OPENAI_REASONING_DEFAULT="medium"
OPENAI_REASONING_HIGH_QUALITY="high"
```

3. Create the database and run the seed:

```bash
npx prisma migrate dev --name init
```

4. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

**If the page looks unstyled or broken after refresh:**
- Run `npm run dev:fresh` to clear the build cache and restart.
- Or use `npm run dev:watch` to auto-restart the server if it crashes.

## Notes

- If `OPENAI_API_KEY` is missing, the app still works and creates a mocked explanation.
- The tutor supports two explanation modes: a cheaper default mode and a higher-quality GPT-5.4 mode.
- Seed data includes Spanish, English, and Japanese examples.
- Prisma stores the SQLite database in `prisma/dev.db`.
- UI supports English and Chinese via the top-right language toggle.
- New questions use a single chat-style prompt instead of separate fields.
- Screenshot upload is stored locally in `public/uploads`.
- Voice input uses the browser Web Speech API when supported.

## solidcore watcher

This repo also includes a local `solidcore` watcher for member-only schedule monitoring.

1. Add `SOLIDCORE_SCHEDULE_URL`, `PUSHOVER_USER_KEY`, and `PUSHOVER_APP_TOKEN` to `.env`.
2. Run `npm run solidcore:login` and log in manually in the opened Chrome window.
3. Run `npm run solidcore:test-notify` to verify your iPhone receives a push.
4. Run `npm run solidcore:check` for one pass or `npm run solidcore:watch` during the release window.
5. Optional on macOS: install `scripts/solidcore/com.jihangao.solidcore-watcher.plist` as a `LaunchAgent` for overnight automatic checks.

Detailed notes live in [scripts/solidcore/README.md](/Users/jihangao/Documents/Playground/scripts/solidcore/README.md).

## Taobao shipping skill

This repo also includes a reusable Taobao logistics extraction skill for Codex.

What it covers:

1. Open Taobao bought-items, jump to a user-specified page, and extract order ids, shop names, item descriptions, carriers, and tracking numbers with real Playwright hover events.
2. Normalize the extracted data into the same shipping-sheet column shape used by the existing `Jihan` sea-shipping template so Codex can duplicate a Google Sheet template and write rows into Drive.

### Local commands

1. Save Taobao login state:

```bash
npm run taobao:login
```

2. Collect a specific bought-items page:

```bash
npm run taobao:collect -- --page 1
```

3. Convert the collected JSON into a sheet-ready payload:

```bash
npm run taobao:prepare-sheet -- --title "Jihan Gao 4月中海运"
```

Artifacts are written to:

- `.local/taobao-shipping/logistics-results.json`
- `.local/taobao-shipping/sheet-payload.json`

### Skill entrypoint

The Codex skill lives at:

- [skills/taobao-shipping-to-sheet/SKILL.md](/Users/jihangao/Documents/playground/skills/taobao-shipping-to-sheet/SKILL.md)

Use it when you want Codex to:

- scrape Taobao logistics from a specified bought-items page
- collect product descriptions alongside tracking numbers
- duplicate a Google Sheets shipping template
- write the normalized rows into Google Drive
