# ============================================================
#  DAVOOD HUNTER AI OS v1.0 — CONFIGURATION
#  Loads .env file and exposes all settings
# ============================================================

import os
from pathlib import Path

def _load_env():
    env_path = Path(__file__).parent / ".env"
    if not env_path.exists():
        return
    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                os.environ.setdefault(key, value)

_load_env()

# ─── AI KEYS ─────────────────────────────────────────────────
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY", "")
KIMI_API_KEY = os.environ.get("KIMI_API_KEY", "")
CLAUDE_API_KEY = os.environ.get("CLAUDE_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# ─── BROKER ──────────────────────────────────────────────────
BROKER = os.environ.get("BROKER", "paper")
EXCHANGE_API_KEY = os.environ.get("EXCHANGE_API_KEY", "")
EXCHANGE_SECRET = os.environ.get("EXCHANGE_SECRET", "")
EXCHANGE_ID = os.environ.get("EXCHANGE_ID", "binance")

# ─── PAPER MODE ──────────────────────────────────────────────
PAPER_MODE = os.environ.get("PAPER_MODE", "true").lower() == "true"

# ─── SECURITY ────────────────────────────────────────────────
WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET", "trh_hunter_secret_change_this")
WEBHOOK_PORT = int(os.environ.get("WEBHOOK_PORT", "8000"))

# ─── TELEGRAM ────────────────────────────────────────────────
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

# ─── RISK MANAGEMENT (Module 15 defaults) ────────────────────
RISK_PER_TRADE = float(os.environ.get("RISK_PER_TRADE", "0.01"))
DAILY_LOSS_LIMIT = float(os.environ.get("DAILY_LOSS_LIMIT", "0.03"))
WEEKLY_LOSS_LIMIT = float(os.environ.get("WEEKLY_LOSS_LIMIT", "0.07"))
MONTHLY_LOSS_LIMIT = float(os.environ.get("MONTHLY_LOSS_LIMIT", "0.12"))
MAX_DAILY_TRADES = int(os.environ.get("MAX_DAILY_TRADES", "3"))
MAX_OPEN_TRADES = int(os.environ.get("MAX_OPEN_TRADES", "2"))
MIN_RR_RATIO = float(os.environ.get("MIN_RR_RATIO", "2.5"))

# ─── AI MODEL ────────────────────────────────────────────────
AI_MODEL = os.environ.get("AI_MODEL", "claude-sonnet-4-20250514")
AI_MAX_TOKENS = int(os.environ.get("AI_MAX_TOKENS", "800"))

# ─── KILL ZONES (Lisbon time, UTC+1) ────────────────────────
LONDON_START = 8
LONDON_END = 11
NY_START = 13
NY_END = 16

# ─── DATABASE ────────────────────────────────────────────────
DB_PATH = os.environ.get("DB_PATH", str(Path(__file__).parent / "trh_journal.db"))
