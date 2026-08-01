# ============================================================
#  DAVOOD HUNTER AI OS v1.0 — CONFIG
#  Fill in your API keys in .env file
# ============================================================

import os
from dotenv import load_dotenv

load_dotenv()

# ─── AI API KEYS (add your keys in .env) ─────────────────────
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
CLAUDE_API_KEY     = os.getenv("CLAUDE_API_KEY", "")
OPENAI_API_KEY     = os.getenv("OPENAI_API_KEY", "")
DEEPSEEK_API_KEY   = os.getenv("DEEPSEEK_API_KEY", "")
GROQ_API_KEY       = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY", "")
NVIDIA_API_KEY     = os.getenv("NVIDIA_API_KEY", "")

# ─── BROKER ──────────────────────────────────────────────────
BROKER           = os.getenv("BROKER", "paper")
EXCHANGE_API_KEY = os.getenv("EXCHANGE_API_KEY", "")
EXCHANGE_SECRET  = os.getenv("EXCHANGE_SECRET", "")
PAPER_MODE       = os.getenv("PAPER_MODE", "true").lower() == "true"

# ─── RISK MANAGEMENT (All Hard Rules from TRH Hunter Method) ─
RISK_PER_TRADE_PCT     = 1.0    # % risk per trade
MIN_RR_RATIO           = 2.5    # minimum R:R
MAX_DAILY_LOSS_PCT     = 3.0    # daily kill switch %
MAX_OPEN_TRADES        = 2      # max simultaneous trades
MAX_DAILY_TRADES       = 3      # max trades per day
MIN_SCORE              = 80     # minimum AI score to execute
MIN_CONFIDENCE         = 70     # minimum AI confidence %
WEEKLY_LOSS_LIMIT_PCT  = 7.0    # weekly loss limit %
MONTHLY_LOSS_LIMIT_PCT = 12.0   # monthly loss limit % → 48h pause
REVENGE_PAUSE_MINUTES  = 30     # mandatory pause after stop loss

# ─── KILLZONES (Lisbon time, auto-converts to UTC) ────────────
# These are LISBON times — the system auto-converts to UTC
# London: 11:00-13:00 Lisbon
# NY: 16:00-18:00 Lisbon
KILLZONES_LISBON = {
    "London":  (11, 13),
    "NewYork": (16, 18),
}

# Auto-convert to UTC based on current DST
def _get_killzones_utc():
    from datetime import datetime, timezone, timedelta
    now_utc = datetime.now(timezone.utc)
    # Lisbon is UTC+0 in winter (WET), UTC+1 in summer (WEST)
    # DST switch: last Sunday of March (spring forward) and last Sunday of October (fall back)
    year = now_utc.year
    # Simple DST check: March-October = summer (UTC+1), November-February = winter (UTC+0)
    month = now_utc.month
    if 3 <= month <= 10:
        offset = 1  # Summer: Lisbon = UTC+1
    else:
        offset = 0  # Winter: Lisbon = UTC+0
    result = {}
    for zone, (lisbon_start, lisbon_end) in KILLZONES_LISBON.items():
        utc_start = lisbon_start - offset
        utc_end = lisbon_end - offset
        result[zone] = (utc_start, utc_end)
    return result

KILLZONES = _get_killzones_utc()

# ─── TELEGRAM ────────────────────────────────────────────────
TELEGRAM_TOKEN   = os.getenv("TELEGRAM_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# ─── SERVER ──────────────────────────────────────────────────
WEBHOOK_PORT   = 8000
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "trh_secret_2024")

# ─── DATABASE ────────────────────────────────────────────────
DB_PATH = "trh_journal.db"
