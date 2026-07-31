# Google Apps Script Webhook — Setup Guide

This guide connects Google Sheets to the Web2WA download tracker. The sheet acts as the download log (filterable/sortable), and the Apps Script webhook appends each download row and returns the running total.

Estimated time: **5–10 minutes**.

## 1. Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet.
2. Rename it, e.g. **Web2WA Downloads**.
3. Leave it as-is — the script creates the `Downloads` sheet and header row for you on the first append.

## 2. Add the Apps Script

1. In the spreadsheet, go to **Extensions → Apps Script**.
2. Delete the default `function myFunction() {}`.
3. Paste the contents of `apps-script/Code.gs` from this repo.
4. Click **Save** (disk icon) and name the project, e.g. `Web2WA Download Log`.

## 3. Set the shared secret

1. In the Apps Script editor, open the **Project Settings** (gear icon).
2. Scroll to **Script properties** and click **Add script property**:
   - Property: `SHEETS_SECRET`
   - Value: a long random string. Generate one, e.g. with `openssl rand -hex 32` (or use the value you put in `SHEETS_SECRET` in `.env`).
3. Save.

## 4. Deploy as a Web App

1. Click **Deploy → New deployment**.
2. Click the gear (⚙️) next to "Select type" and choose **Web app**.
3. Settings:
   - **Description:** `Web2WA download log`
   - **Execute as:** *Me*
   - **Who has access:** *Anyone* (the webhook verifies the shared secret itself — access control happens inside `doPost`)
4. Click **Deploy**, then **Authorize access** with your Google account (warned about an unverified app — that's expected for a personal web app; proceed).
5. Copy the **Web app URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

## 5. Wire it into the app

Put the URL and the secret in `.env.local`:

```
SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/AKfycb.../exec
SHEETS_SECRET=<your shared secret>
```

## How it works

- The server `POST`s JSON to the webhook URL on every download:
  ```json
  {
    "secret": "...",
    "timestamp": "2026-07-31T14:05:03.000Z",
    "version": "2.2.0",
    "country": "Nigeria",
    "browser": "Chrome",
    "os": "Android",
    "userAgent": "...",
    "referrer": "google.com"
  }
  ```
- The script verifies `secret`, appends one row, and responds:
  ```json
  { "ok": true, "total": 123 }
  ```
- `total` (rows minus the header) feeds the "running total" shown in the Telegram notification.

## Notes

- **Quota:** Apps Script Web Apps allow roughly 20,000 events per day — far beyond this project's needs.
- **Row structure:** `Timestamp | Plugin Version | Country | Browser | OS | User Agent | Referrer`. Timestamps are ISO-8601 UTC so they sort correctly.
- **Privacy:** the webhook URL and secret are server-side only; they never reach the browser.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `403 Unauthorized` | Secret mismatch — check `SHEETS_SECRET` in `.env` matches the script property |
| `500 SHEETS_SECRET script property not set` | Add the script property in Project Settings (step 3) and redeploy |
| No rows appear | Re-deploy the web app after editing `Code.gs` (**Deploy → Manage deployments → Edit → New version**) |
| Changes don't take effect | Apps Script web apps cache for ~5 min after redeploying |
