# INSTITUTIONAL HUNTER AI — Setup Guide
## From zero to running in 6 steps

---

## STEP 1 — Install Python dependencies

```bash
cd trading_agent
pip install -r requirements.txt
```

---

## STEP 2 — Configure your .env file

```bash
cp .env.example .env
nano .env   # fill in your real API keys
```

Keys to fill in:
- `CLAUDE_API_KEY` → get from console.anthropic.com
- `EXCHANGE_API_KEY` / `EXCHANGE_SECRET` → from Bybit/Binance settings
- `WEBHOOK_SECRET` → make up any random string
- `TELEGRAM_TOKEN` / `TELEGRAM_CHAT_ID` → optional, from @BotFather

**Keep PAPER_MODE=true until you validate everything.**

---

## STEP 3 — Run the server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Test it works:
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status":"online","paper_mode":true,"kill_switch":false}
```

---

## STEP 4 — Expose your server (for TradingView)

TradingView needs a public URL. Options:

**A) ngrok (easiest for testing):**
```bash
ngrok http 8000
# Copy the https://xxxx.ngrok.io URL
```

**B) VPS (recommended for production):**
- Hetzner / DigitalOcean — ~5€/month Ubuntu server
- Point your domain DNS to VPS IP
- Run with nginx reverse proxy

---

## STEP 5 — TradingView Pine Script setup

1. Open TradingView → Pine Script Editor (bottom panel)
2. Paste the contents of `InstitutionalHunterAI.pine`
3. Click "Add to chart"
4. You will see the indicator with the info table top-right

**Creating Alerts:**
1. Right-click on chart → "Add Alert"
2. Condition: "Institutional Hunter AI" → "Any alert() function call"
3. Set "Alert name": Long Setup / Short Setup / FVG / BOS
4. Under "Notifications" → check "Webhook URL"
5. URL: `https://YOUR_SERVER/webhook`
6. Under "Message" → paste one of these JSON messages:

   For LONG alerts — copy from the `long_msg` variable in Pine Script
   For SHORT alerts — copy from the `short_msg` variable

7. Add custom header: `x-webhook-secret: your_secret_here`

---

## STEP 6 — Test the full pipeline

Send a test webhook manually:
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "XAUUSD",
    "event": "liquidity_sweep_low",
    "price": 2341.50,
    "session": "London",
    "timeframe": "5",
    "htf_bias": "BULLISH",
    "liquidity_level": 2338.0,
    "atr": 1.2,
    "notes": "EQL swept in London killzone"
  }'
```

You should receive a JSON decision from Claude.

---

## Emergency Commands

```bash
# Activate kill switch immediately
curl -X POST http://localhost:8000/kill \
  -H "x-webhook-secret: your_secret_here"

# Check status
curl http://localhost:8000/status

# Reset kill switch (after manual review)
curl -X POST http://localhost:8000/reset \
  -H "x-webhook-secret: your_secret_here"
```

---

## Validation Checklist (before going live)

- [ ] Server runs without errors
- [ ] /health endpoint responds
- [ ] Test webhook reaches /analyze and Claude responds
- [ ] Paper trades appear in journal.db
- [ ] Telegram alerts arrive on phone
- [ ] Kill switch works
- [ ] Pine Script visible on TradingView chart
- [ ] TradingView alert fires on test condition
- [ ] Webhook received by server from TradingView
- [ ] Run paper mode for minimum 30 days
- [ ] Review all trades in journal.db before going live
