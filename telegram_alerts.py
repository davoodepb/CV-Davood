# ============================================================
#  DAVOOD HUNTER AI OS v1.0 — TELEGRAM ALERTS
#  Phone notifications for every signal and trade
# ============================================================

import json
import urllib.request
import urllib.error
from config import TELEGRAM_TOKEN, TELEGRAM_CHAT_ID


def send_telegram_sync(message: str) -> bool:
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        return False
    if TELEGRAM_TOKEN == "YOUR_BOT_TOKEN" or TELEGRAM_CHAT_ID == "YOUR_CHAT_ID":
        return False

    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
        payload = json.dumps({
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "HTML"
        }).encode()

        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            result = json.loads(r.read())
            if result.get("ok"):
                print("[TG] Message sent")
                return True
            else:
                print(f"[TG] API error: {result}")
                return False

    except Exception as e:
        print(f"[TG] Send error: {e}")
        return False


def send_trade_alert(action: str, symbol: str, score: int, entry: float,
                     sl: float, tp: float, rr: float) -> bool:
    emoji = "🟢" if action == "LONG" else "🔴" if action == "SHORT" else "⏸"
    msg = (
        f"<b>{emoji} {action} Signal — {symbol}</b>\n"
        f"━━━━━━━━━━━━━━━\n"
        f"Score: <b>{score}/100</b>\n"
        f"Entry: <code>{entry}</code>\n"
        f"SL: <code>{sl}</code>\n"
        f"TP: <code>{tp}</code>\n"
        f"R:R: <b>{rr}R</b>\n"
        f"━━━━━━━━━━━━━━━\n"
        f"<i>DAVOOD HUNTER AI OS v1.0</i>"
    )
    return send_telegram_sync(msg)


def send_kill_switch_alert(reason: str) -> bool:
    msg = (
        f"🛑 <b>KILL SWITCH ACTIVATED</b>\n"
        f"━━━━━━━━━━━━━━━\n"
        f"Reason: {reason}\n"
        f"All trading halted.\n"
        f"━━━━━━━━━━━━━━━\n"
        f"<i>DAVOOD HUNTER AI OS v1.0</i>"
    )
    return send_telegram_sync(msg)


def send_daily_summary(summary: dict) -> bool:
    msg = (
        f"📊 <b>Daily Summary — {summary.get('date')}</b>\n"
        f"━━━━━━━━━━━━━━━\n"
        f"Trades: {summary.get('total_trades', 0)}\n"
        f"Wins: {summary.get('wins', 0)} | Losses: {summary.get('losses', 0)}\n"
        f"Win Rate: {summary.get('win_rate', 0)}%\n"
        f"P&L: <b>{summary.get('total_pnl', 0):+.2f} USD</b>\n"
        f"━━━━━━━━━━━━━━━\n"
        f"<i>DAVOOD HUNTER AI OS v1.0</i>"
    )
    return send_telegram_sync(msg)
