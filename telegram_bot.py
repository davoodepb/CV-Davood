# ============================================================
#  DAVOOD HUNTER AI OS v1.0 — TELEGRAM BOT LISTENER
#  Listens for commands and responds via Telegram
#  Run this alongside main.py for full Telegram control
# ============================================================

import json
import urllib.request
import time
import threading
from datetime import datetime, timezone, timedelta

from config import TELEGRAM_TOKEN, TELEGRAM_CHAT_ID
from risk_manager import (
    is_killed, activate_kill_switch, reset_kill_switch,
    get_risk_summary, in_killzone, is_monthly_paused,
    get_monthly_pause_remaining, get_position_size_multiplier
)
from journal import get_recent_decisions, get_open_trades, get_weekly_report

BOT_URL = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"
offset = 0


def send_message(text, chat_id=None):
    if chat_id is None:
        chat_id = TELEGRAM_CHAT_ID
    try:
        url = f"{BOT_URL}/sendMessage"
        payload = json.dumps({
            "chat_id": chat_id,
            "text": text[:4000]
        }).encode()
        req = urllib.request.Request(url, data=payload,
            headers={"Content-Type": "application/json"}, method="POST")
        urllib.request.urlopen(req, timeout=15)
    except Exception as e:
        print(f"[TG BOT] Send error: {e}")


def handle_command(command, chat_id):
    cmd = command.strip().lower()

    if cmd == "/start" or cmd == "/help":
        send_message(
            "DAVOOD HUNTER AI — Commands:\n"
            "\n"
            "/status — Server & risk status\n"
            "/report — Today's full report\n"
            "/daily — Daily activity report\n"
            "/signals — Recent signals\n"
            "/trades — Open trades\n"
            "/weekly — Weekly performance\n"
            "/kill — Emergency kill switch\n"
            "/reset — Reset kill switch\n"
            "/risk — Full risk summary\n"
            "/help — Show this message\n"
            "\n"
            "Or send any text to chat with me.",
            chat_id
        )

    elif cmd == "/status":
        kz_active, kz_name = in_killzone()
        killed = is_killed()
        paused = is_monthly_paused()
        now = datetime.now(timezone.utc) + timedelta(hours=1)
        status = (
            f"DAVOOD HUNTER AI — STATUS\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"Time: {now.strftime('%H:%M')} Lisbon\n"
            f"Kill Zone: {'ACTIVE (' + kz_name + ')' if kz_active else 'INACTIVE'}\n"
            f"Kill Switch: {'ARMED' if killed else 'OK'}\n"
            f"Monthly Pause: {'YES (' + get_monthly_pause_remaining() + ')' if paused else 'NO'}\n"
            f"Size: {int(get_position_size_multiplier() * 100)}%\n"
            f"Mode: PAPER\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"Agent is {'WAITING' if not kz_active else 'HUNTING'}"
        )
        send_message(status, chat_id)

    elif cmd == "/report":
        from daily_report import format_full_report
        report = format_full_report()
        send_message(report, chat_id)

    elif cmd == "/daily":
        from daily_report import format_full_report
        report = format_full_report()
        send_message(report, chat_id)

    elif cmd == "/signals":
        decisions = get_recent_decisions(5)
        if not decisions:
            send_message("No signals yet.", chat_id)
            return
        msg = "RECENT SIGNALS:\n━━━━━━━━━━━━━━━━━━━━━━━━\n"
        for d in decisions:
            action = d.get("action", "?")
            score = d.get("score", 0) or 0
            symbol = d.get("symbol", "?")
            ts = d.get("timestamp", "")
            try:
                time_str = ts.split("T")[1][:5]
            except:
                time_str = "??:??"
            status = "EXECUTED" if d.get("executed") else "BLOCKED"
            msg += f"{action} {symbol} | Score: {score} | {time_str} | {status}\n"
        send_message(msg, chat_id)

    elif cmd == "/trades":
        trades = get_open_trades()
        if not trades:
            send_message("No open trades.", chat_id)
            return
        msg = "OPEN TRADES:\n━━━━━━━━━━━━━━━━━━━━━━━━\n"
        for t in trades:
            msg += (
                f"{t['side']} {t['symbol']} | Lot: {t['lot_size']}\n"
                f"Entry: {t['entry']} | SL: {t['sl']} | TP: {t['tp']}\n"
                f"Risk: ${t['risk_usd']:.2f}\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
            )
        send_message(msg, chat_id)

    elif cmd == "/weekly":
        report = get_weekly_report()
        msg = (
            f"WEEKLY REPORT:\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"Week: {report['week_start']}\n"
            f"Trades: {report['total_trades']}\n"
            f"Wins: {report['wins']} | Losses: {report['losses']}\n"
            f"Win Rate: {report['win_rate']:.0f}%\n"
            f"P/L: {report['pnl_usd']:+.2f} USD ({report['pnl_r']:+.1f}R)\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━"
        )
        send_message(msg, chat_id)

    elif cmd == "/kill":
        activate_kill_switch("Manual via Telegram /kill command")
        send_message(
            "KILL SWITCH ACTIVATED\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "All trading HALTED.\n"
            "No new trades will be taken.\n"
            "Send /reset to resume.",
            chat_id
        )

    elif cmd == "/reset":
        reset_kill_switch()
        send_message(
            "KILL SWITCH RESET\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "Agent is back online.\n"
            "Hunting resumes at next kill zone.",
            chat_id
        )

    elif cmd == "/risk":
        try:
            from main import broker as b
            balance = b.get_balance() if b else 10000
        except:
            balance = 10000
        summary = get_risk_summary(balance)
        msg = (
            f"RISK MANAGEMENT\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"Kill Switch: {'ARMED' if summary['kill_switch_active'] else 'OK'}\n"
            f"Monthly Pause: {'YES' if summary['monthly_paused'] else 'NO'}\n"
            f"Size Reduction: {summary['size_reduction']}\n"
            f"Losing Weeks: {summary['consecutive_losing_weeks']}\n"
            f"\nDaily P/L: {summary['daily_pnl_pct']}%\n"
            f"Daily Trades: {summary['daily_trades']}/{summary['max_daily_trades']}\n"
            f"Open Trades: {summary['open_trades']}/{summary['max_open_trades']}\n"
            f"\nWeekly P/L: {summary['weekly_pnl_pct']}%\n"
            f"Monthly P/L: {summary['monthly_pnl_pct']}%\n"
            f"\nRisk Per Trade: {summary['min_score_required']}% min score\n"
            f"Min R:R: {summary['min_rr_required']}\n"
            f"\nRevenge Pause: {'ACTIVE' if summary['revenge_pause_active'] else 'OK'}"
        )
        if summary.get("revenge_pause_info"):
            msg += f"\n{summary['revenge_pause_info']}"
        send_message(msg, chat_id)

    else:
        # Free text — could be analyzed as a market question
        send_message(
            f"Received: {command}\n\n"
            f"Send /help to see available commands.",
            chat_id
        )


def poll_messages():
    global offset
    print("[TG BOT] Listening for commands...")

    while True:
        try:
            url = f"{BOT_URL}/getUpdates?offset={offset}&timeout=30"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=35) as r:
                data = json.loads(r.read())

            for update in data.get("result", []):
                offset = update["update_id"] + 1
                msg = update.get("message", {})
                chat_id = str(msg.get("chat", {}).get("id", ""))
                text = msg.get("text", "")

                if chat_id == TELEGRAM_CHAT_ID and text:
                    print(f"[TG BOT] Command: {text}")
                    handle_command(text, chat_id)

        except Exception as e:
            print(f"[TG BOT] Poll error: {e}")
            time.sleep(5)

        time.sleep(1)


def start_bot():
    if not TELEGRAM_TOKEN or "YOUR_" in TELEGRAM_TOKEN:
        print("[TG BOT] No Telegram token configured")
        return
    t = threading.Thread(target=poll_messages, daemon=True)
    t.start()
    print("[TG BOT] Bot started")


if __name__ == "__main__":
    start_bot()
    print("[TG BOT] Running... Press Ctrl+C to stop")
    while True:
        time.sleep(60)
