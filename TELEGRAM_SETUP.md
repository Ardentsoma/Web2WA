# Telegram Bot — Setup Guide

This guide creates the Telegram bot that sends a notification every time the Web2WA plugin is downloaded.

Estimated time: **2–3 minutes**.

## 1. Create the bot

1. Open **Telegram** and search for **@BotFather** (the official bot creator).
2. Start a chat and send:
   ```
   /newbot
   ```
3. Follow the prompts:
   - **Name** — e.g. `Web2WA Download Alerts`
   - **Username** — must end in `bot`, e.g. `web2wa_alerts_bot`
4. BotFather replies with a **token**, something like:
   ```
   123456789:AAF34Kd92mXpQ...9sT8bQ
   ```
   Copy it — this is your `TELEGRAM_BOT_TOKEN`.

> **Security:** the token is a secret. It stays in `.env.local` (server-side only) — never commit it or paste it into the frontend.

## 2. Get your chat ID

1. Open a chat with your new bot (search for its `@username`) and send it any message, e.g. `hi`.
2. In a browser or terminal, call the `getUpdates` API, replacing the token:
   ```
   https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
   ```
   (On Windows terminal: `curl "https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates"`)
3. Look at the response for a `chat` object. Your numeric **chat ID** is under `"chat":{"id":<NUMBER>}`.
   - For a private chat it's a positive number, e.g. `987654321`.
   - If you want notifications in a **group**, add the bot to the group, send a message there, and the chat ID is a negative number.

## 3. Wire it into the app

Add both values to `.env.local` (next to `SHEETS_WEBHOOK_URL` and `SHEETS_SECRET`):

```
TELEGRAM_BOT_TOKEN=123456789:AAF34Kd92mXpQ...9sT8bQ
TELEGRAM_CHAT_ID=987654321
```

## 4. Verify

Run a quick test to confirm the bot can message you:

```
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/sendMessage" -H "Content-Type: application/json" -d "{\"chat_id\":<YOUR_CHAT_ID>,\"text\":\"Telegram setup OK\"}"
```

If you receive the message, setup is complete. The next step is to have the app send a real test notification.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `chat not found` / 400 | The bot hasn't been messaged yet — send it a message first (step 2) |
| `Unauthorized` (401) | Wrong token — copy it again from BotFather with `/token` |
| No reply from `getUpdates` | Bot must have received at least one message before it shows up in the update list |
| Group ID negative | Fine — use the negative number as-is |
