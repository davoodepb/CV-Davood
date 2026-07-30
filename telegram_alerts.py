# ============================================================
#  DAVOOD HUNTER AI OS v1.0 — TELEGRAM ALERTS
# ============================================================

import urllib.request
import json
from config import TELEGRAM_TOKEN, TELEGRAM_CHAT_ID


def send_telegram_sync(message: str):
    """Synchronous telegram send — works without asyncio"""
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    body = json.dumps({
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML"
    }).encode()

    try:
        req = urllib.request.Request(url, data=body,
            headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=10):
            pass
    except Exception as e:
        print(f"[TELEGRAM] Error: {e}")
