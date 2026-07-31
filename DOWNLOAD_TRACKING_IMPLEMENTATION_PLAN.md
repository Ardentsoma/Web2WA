# Download Tracking System — Implementation Plan & Documentation

> This document is both the implementation plan and the project documentation for the Web2WA download tracking system.

## 1. Objective

When a user clicks **Download Plugin**, they must immediately receive the latest `web2wa-plugin.zip`. Behind the scenes, the backend records the download, appends the details to a Google Sheet, and sends a real-time Telegram notification — **without ever blocking or delaying the file download**.

**User experience stays exactly the same.** The browser downloads the ZIP on click, exactly as it does today.

## 2. Understanding of the Feature

### Current behavior
`downloadPlugin()` in `src/App.tsx:278` fetches `/web2wa-plugin.zip` (a static file, copied from `public/` into `dist/` at build time), converts it to a blob, and triggers a save. There is no tracking, no backend, and no notification.

### Target behavior
1. User clicks **Download Plugin**.
2. Frontend calls `GET /api/download` (same origin in production).
3. Backend checks for duplicate requests (same IP within 10 seconds) and silently skips analytics if it is a duplicate — but always serves the file.
4. Backend **immediately** streams the ZIP as an attachment (this is the priority; analytics never waits on it).
5. In parallel, the analytics pipeline (`logDownload()`) runs:
   - Appends a row to a Google Sheet.
   - Sends a Telegram notification (with the running total of downloads).
6. Any failure in the analytics pipeline is swallowed — the file was already on its way.

## 3. Existing Project Structure

| Path | Purpose |
|---|---|
| `src/App.tsx` | React frontend; contains `downloadPlugin()` (line 278) which fetches the ZIP directly |
| `public/web2wa-plugin.zip` | The plugin ZIP served as a static file |
| `public/web2wa-plugin.php` | WordPress plugin source; header contains `Version: 2.2.0` |
| `zip-plugin.ts` | Builds `public/web2wa-plugin.zip` from the PHP source |
| `vite.config.ts` | Vite + React + Tailwind config; no proxy today |
| `package.json` | Already includes `express`, `dotenv`, `tsx`; **no server file exists yet** |
| `.env.example` | Documents `GEMINI_API_KEY` and `APP_URL` |
| `dist/` | Production build output (frontend + a copy of the plugin files) |

**Key fact:** the app is currently static-only. `express`, `dotenv`, and `tsx` are installed but unused. A backend must be added; the platform (AI Studio / Cloud Run) is expected to execute it (flagged as a checkpoint in Phase 2).

## 4. Proposed Architecture & Rationale

### Overview
```
Browser ──► GET /api/download ──► Express (server/index.ts)
                                      │
                                      ├─► dedupe check (in-memory, 10s window) ── sync, instant
                                      ├─► stream web2wa-plugin.zip ──► response (priority, zero delay)
                                      │
                                      └─► logDownload(entry)  ──► fire-and-forget (async)
                                             ├─► GoogleSheets.appendRow()   ──► Apps Script webhook
                                             └─► Telegram.sendNotification() ──► Bot API (includes running total)
```

### Backend
- **Express** (already a dependency) serves both the built app and the API from one process → single origin, no CORS in production.
- `GET /api/download` stays a **thin route**: build the analytics entry, call `logDownload()`, then send the file. All analytics logic lives behind one function so the route never changes when storage or notification providers change.

### Clean, modular structure
```
server/
  index.ts                Express bootstrap: serves dist/, mounts routes, central error handling
  plugin.ts               Plugin metadata: parses Version from web2wa-plugin.php; resolves zip path
  userAgent.ts            Dependency-free browser + OS parsing from the User-Agent header
  analytics/
    types.ts              AnalyticsEntry type (the single data contract)
    logDownload.ts        Orchestrator: dedupe check → append → notify (all failures swallowed)
    storage/
      googleSheets.ts     appendRow() adapter → Apps Script webhook; returns running total
    notify/
      telegram.ts         sendNotification() adapter → Telegram Bot API
  routes/
    download.ts           GET /api/download
```

### Why this is the right approach
- **Separation of concerns:** download handling and analytics are fully separated. The download route never imports Google Sheets or Telegram directly — it only calls `logDownload()`.
- **Swappable storage:** `googleSheets.ts` exposes one function (`appendRow`). Replacing Google Sheets with Supabase (or anything else) later means writing a new adapter and swapping it in `logDownload()` — no other code changes.
- **Zero new dependencies:** Google Sheets is reached through a lightweight Apps Script webhook (HTTP POST), Telegram through the Bot HTTP API, and both use Node's built-in `fetch`. UA/OS parsing is a ~30-line regex module. `express` + `dotenv` + `tsx` already exist in `package.json`.
- **Download never blocks:** the file is streamed before/while analytics runs asynchronously. This is the strongest way to honor "never interrupt or delay the download."

## 5. External Services, APIs, Credentials & Configuration

### 5.1 Google Sheets (via Google Apps Script)
- A Google Sheet with a header row, plus a small Apps Script bound to it, deployed as a **Web App** with a `doPost` function.
- The script appends one row per request and returns the new running total in its JSON response.
- The backend calls the deployed webhook URL with `POST` + JSON body.
- **Why not the official Google Sheets API:** it requires a GCP service account, a credentials file, and the `googleapis` npm package. The Apps Script webhook achieves the same result with no credentials file, no new dependencies, and a copy/paste setup.

**Setup deliverables (Phase 1):**
- `apps-script/Code.gs` — the versioned Apps Script source (paste into the script editor, then deploy).
- `APPS_SCRIPT_SETUP.md` — step-by-step: create sheet → create script → paste code → deploy as Web App → copy URL.

### 5.2 Telegram (for notifications)
- A bot created with **BotFather** → gives `TELEGRAM_BOT_TOKEN`.
- Your chat ID (`TELEGRAM_CHAT_ID`) — obtained by messaging the bot and reading `getUpdates` (documented in setup).
- Backend sends `POST https://api.telegram.org/bot<TOKEN>/sendMessage`.
- **Why Telegram:** free, instant, no email/SMS costs, first-class Bot API, ~15 lines of code to integrate. It is the most lightweight reliable option available.

### 5.3 Environment variables (`.env.example`)
```
SHEETS_WEBHOOK_URL   Apps Script web app URL (created in setup)
SHEETS_SECRET        Shared secret the script verifies before appending (blocks spam)
TELEGRAM_BOT_TOKEN   From BotFather
TELEGRAM_CHAT_ID     Your Telegram user/chat ID
PLUGIN_ZIP_PATH      Optional override; defaults to public/web2wa-plugin.zip
```
Real values go in `.env.local` (already gitignored). `dotenv` is already a dependency.

## 6. Google Sheet Structure

Header row (freeze top row; sheet name: `Downloads`):

| Timestamp | Plugin Version | Country | Browser | OS | User Agent | Referrer |

- **Timestamp:** ISO 8601 UTC (`new Date().toISOString()`) — sorts correctly in Sheets.
- Columns are filterable/sortable as-is; future reports (by version, by country, daily trends) are simple pivot/sort operations on these columns.
- Apps Script `appendRow()` handles quoting/escaping automatically, so values containing commas or quotes are safe.

## 7. Notification Format (Telegram)

Plain text, emoji-light, one message per download:

```
⬇️ New Plugin Download

Version: 2.2.0
Time:    2026-07-31 14:05:03 UTC
Country: Nigeria
Browser: Chrome
OS:      Android
Referrer: google.com

Total downloads: 123
```

- **Running total** comes from the Google Sheets response (`total`) after the row is appended. If the sheet append failed, the total is shown as `n/a` and the notification still sends.
- Plain text (no `parse_mode`) avoids escaping bugs — lightweight and maintainable.

## 8. Reliability & Duplicate Protection

### Reliability contract (download is priority #1)
- The ZIP is streamed to the client before analytics completes; analytics runs fire-and-forget.
- Every step in `logDownload()` is individually wrapped in `try/catch`. Failures are logged to the server console only.
- Google Sheets unavailable → no row, no crash, notification still attempts (with `total: n/a`).
- Telegram unavailable → swallowed after sheet append succeeds.
- ZIP file missing → clean JSON 404, never a crash.

### Duplicate protection
- In-memory `Map<ip, lastTimestamp>` with a 10-second window (configurable via `DEDUPE_WINDOW_MS`, default `10_000`).
- Identical IP within the window → analytics skipped, file still served.
- Entries older than the window are pruned lazily on each request, so memory stays bounded.
- **Limitation (documented):** per-instance only. With multiple server instances, dedupe would need a shared store (e.g., Redis) — out of scope now, noted for the future.

## 9. Data Privacy

Only the required fields are recorded — **IP addresses are NOT stored** (they are used transiently in memory only, for deduplication). No emails, names, or personal identifiers are collected. Country is recorded only when a header supplies it (e.g., Cloudflare `cf-ipcountry`, App Engine `x-appengine-country`); otherwise it is `Unknown`.

## 10. Phased Implementation Plan

| Phase | Deliverables | Purpose |
|---|---|---|
| **1 — External services & config** | `APPS_SCRIPT_SETUP.md`, `apps-script/Code.gs`, updated `.env.example` | Set up the sheet webhook + Telegram bot; document all credentials |
| **2 — Server foundation** | `server/index.ts`, `server/plugin.ts`, `server/userAgent.ts`, npm scripts (`server`, `start`) | Boot the Express server, serve `dist/`, health check, plugin metadata, UA parsing. **Checkpoint:** confirm the platform executes the server |
| **3 — Analytics service** | `analytics/types.ts`, `analytics/storage/googleSheets.ts`, `analytics/notify/telegram.ts`, `analytics/logDownload.ts` | The isolated, swappable analytics pipeline with dedupe and failure isolation |
| **4 — Download endpoint** | `routes/download.ts` | `GET /api/download`: dedupe → stream ZIP → fire-and-forget `logDownload()` |
| **5 — Frontend + verification** | `src/App.tsx` change, `vite.config.ts` proxy, `.env.example` final | Point the button at `/api/download`; typecheck, build, and end-to-end test (click → file downloads → row in sheet → Telegram message) |

Each phase is implemented and explained before moving on; commits stay small.

## 11. Edge Cases & Risks

| Case | Handling |
|---|---|
| Google Sheets down | Append fails silently; download unaffected; Telegram still fires with `total: n/a` |
| Telegram down | Notification fails silently; sheet still gets the row |
| Double-click / refresh (same IP < 10s) | Analytics skipped; file still served |
| ZIP file missing | JSON 404 with a clear message |
| Version parse fails | Fallback constant (`0.0.0`-style) logged to console |
| No country header | Stored as `Unknown` |
| Unrecognized browser/OS | UA parser returns `Unknown` |
| Apps Script webhook abused | Shared `SHEETS_SECRET` checked server-side by the script; wrong/missing secret → ignored |
| Apps Script free-tier quota | Web apps allow ~20k events/day; ample for this scale. Noted in docs |
| Server restarts | Dedupe map resets (acceptable); sheet is the source of truth for totals |
| Multi-instance deployment | In-memory dedupe is per-instance; noted as a future enhancement |
| Platform serves static only | Flagged at Phase 2 checkpoint; alternative hosting for the API discussed before proceeding |

## 12. Security Notes

- No secrets are bundled into the frontend; all credentials are server-side via `.env.local`.
- The Apps Script webhook verifies `SHEETS_SECRET` before appending.
- Telegram bot token is only used server-side.
- The download route reads a fixed, server-side path (no user-controlled input) → no path traversal.
- `.env*` is already gitignored except `.env.example`.

## 13. Status

- ✅ Plan approved (Phase 1 started).
- ✅ **Phase 1 complete:** `apps-script/Code.gs`, `APPS_SCRIPT_SETUP.md`, updated `.env.example`.
- ✅ **Phase 2 complete:** `server/index.ts`, `server/plugin.ts`, `server/userAgent.ts`, `server/env.ts`, `server`/`start` npm scripts, `esModuleInterop` in tsconfig. Health/404/static verified locally.
- ✅ **Phase 3 complete:** `server/analytics/types.ts`, `storage/googleSheets.ts`, `notify/telegram.ts`, `logDownload.ts`, `index.ts` factory. Verified: sheet append works, dedupe works, Telegram not configured yet (fails gracefully).
- ✅ **Phase 4 complete:** `server/routes/download.ts` mounted at `/api/download`. Verified: serves the ZIP as attachment (application/zip, 4637 bytes identical to source), analytics fires, same-IP dedupe works.
- ✅ **Phase 5 complete:** `downloadPlugin()` now fetches `/api/download` (identical UX), vite dev proxy for `/api` → port 8080. Verified end-to-end: frontend 200, built JS references `/api/download`, endpoint serves `application/zip`.

### Vercel deployment

The hosting platform is **Vercel** (not Cloud Run). Vercel does **not** run `npm start`; it serves `dist/` statically and runs serverless functions from `api/`. Adaptation (verified locally):

- `api/download.ts`, `api/health.ts` — Vercel serverless functions reusing the analytics/plugin/UA modules. Download is sent **before** analytics runs; the awaited `logDownload()` keeps the function alive so notifications still complete.
- `server/downloadCore.ts` — shared payload logic (zip buffer + analytics entry) used by both the Vercel function and the local Express route.
- `vercel.json` — `buildCommand: npm run build`, `outputDirectory: dist`, SPA rewrite excluding `/api/*`, and `includeFiles` bundling the zip + PHP into the download function.
- **Dedupe on Vercel is best-effort (in-memory, per warm instance).** Two rapid clicks can hit different instances and both be logged. Documented limitation; Vercel KV would fix it later.
- **Env vars must be added in Vercel project settings** (`.env.local` is gitignored and never deploys): `SHEETS_WEBHOOK_URL`, `SHEETS_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `APP_URL`.

### Phase 2 checkpoint (hosting)

The app is now served by the Express server. In production:
1. `npm run build` (frontend → `dist/`)
2. `npm start` (runs `tsx server/index.ts`, serves `dist/` + API on `PORT`, default 8080)

**Verify your platform executes `npm start` and runs a server process.** The AI Studio / Cloud Run comments in this repo suggest it does (Cloud Run injects `PORT`). If the platform turns out to be static-only, the API must be hosted elsewhere — flag this before deployment.
