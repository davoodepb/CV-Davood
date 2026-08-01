# ============================================================
#  DAVOOD HUNTER AI OS v1.0 — MAIN SERVER
#  Webhook → AI Brain → Risk Manager → Execution
#
#  Run: python main.py
# ============================================================

import json
from datetime import datetime, timezone, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import urllib.parse
import time
import os

from config import WEBHOOK_PORT, WEBHOOK_SECRET, PAPER_MODE
from ai_brain import ask_claude
from execution import get_broker, execute_trade, start_trade_poller
from risk_manager import (
    approve_trade, get_risk_summary, is_killed, in_killzone,
    activate_kill_switch, reset_kill_switch, update_weekly_size_reduction
)
from journal import init_db, log_decision
from telegram_alerts import send_telegram_sync
from telegram_bot import start_bot
from daily_report import send_daily_report, init_daily_report_table
from session_manager import session_manager

broker = None


def format_decision_report(decision: dict, alert: dict, approved: bool, reason: str) -> str:
    action = decision.get("action", "WAIT")
    score = decision.get("score", 0) or 0
    bar = "█" * (score // 10) + "░" * (10 - score // 10)

    if action == "WAIT":
        return (
            f"⏸ WAIT — {alert.get('symbol','?')}\n"
            f"Score: {score}/100 [{bar}]\n"
            f"Reason: {decision.get('reasoning','')[:120]}\n"
            f"Rejects: {', '.join(decision.get('reject_reasons',[]))}"
        )
    elif approved:
        emoji = "🟢" if action == "LONG" else "🔴"
        return (
            f"{emoji} {action} — {alert.get('symbol','?')}\n"
            f"━━━━━━━━━━━━━━━\n"
            f"Score: {score}/100 [{bar}]\n"
            f"Entry: {decision.get('entry')}\n"
            f"SL:    {decision.get('sl')}\n"
            f"TP:    {decision.get('tp')}\n"
            f"R:R:   {decision.get('rr_ratio')}R\n"
            f"Conf:  {decision.get('confidence')}%\n"
            f"Zone:  {decision.get('session')}\n"
            f"━━━━━━━━━━━━━━━\n"
            f"{decision.get('reasoning','')[:150]}"
        )
    else:
        return (
            f"🚫 {action} BLOCKED — {alert.get('symbol','?')}\n"
            f"Score: {score}/100\n"
            f"Reason: {reason}"
        )


class TRHHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path == "/health":
            in_kz, kz = in_killzone()
            data = {
                "status": "DAVOOD HUNTER AI OS v1.0 — ONLINE",
                "paper_mode": PAPER_MODE,
                "kill_switch": is_killed(),
                "in_killzone": in_kz,
                "killzone": kz,
                "utc_time": datetime.now(timezone.utc).isoformat()
            }
            self._respond(200, data)

        elif self.path == "/status":
            try:
                balance = broker.get_balance()
            except:
                balance = None
            summary = get_risk_summary(balance or 10000)
            summary["balance"] = balance
            self._respond(200, summary)

        else:
            self._respond(404, {"error": "Not found"})

    def do_POST(self):
        secret = self.headers.get("x-webhook-secret", "")
        if secret != WEBHOOK_SECRET:
            self._respond(403, {"error": "Invalid secret"})
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            alert_data = json.loads(body)
        except:
            self._respond(400, {"error": "Invalid JSON"})
            return

        if self.path == "/webhook":
            result = process_webhook(alert_data)
            self._respond(200, result)

        elif self.path == "/analyze":
            print(f"[ANALYZE] {alert_data}")
            decision = ask_claude(alert_data)
            self._respond(200, {"decision": decision, "note": "Analysis only"})

        elif self.path == "/kill":
            activate_kill_switch("Manual via /kill endpoint")
            send_telegram_sync("🛑 KILL SWITCH ACTIVATED — Manual via API")
            self._respond(200, {"status": "kill_switch_activated"})

        elif self.path == "/reset":
            reset_kill_switch()
            send_telegram_sync("✅ KILL SWITCH RESET — Agent back online")
            self._respond(200, {"status": "kill_switch_reset"})

        else:
            self._respond(404, {"error": "Unknown endpoint"})

    def _respond(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)


def process_webhook(alert_data: dict) -> dict:
    print(f"\n[WEBHOOK] {alert_data.get('symbol')} — {alert_data.get('event')}")

    if is_killed():
        return {"status": "blocked", "reason": "Kill switch active"}

    # VALIDATE: Price must come from TradingView, never fabricated
    price = alert_data.get("price")
    symbol = alert_data.get("symbol", "")
    if not price or price == 0:
        return {"status": "blocked", "reason": "No live price in alert data"}
    if price < 0:
        return {"status": "blocked", "reason": "Invalid price"}

    # Price sanity check — reject if too far from expected range
    if "XAU" in symbol.upper():
        if price < 1500 or price > 5000:
            return {"status": "blocked", "reason": f"XAUUSD price {price} outside valid range"}
    elif "NAS" in symbol.upper() or "US100" in symbol.upper():
        if price < 5000 or price > 50000:
            return {"status": "blocked", "reason": f"NAS100 price {price} outside valid range"}

    decision = ask_claude(alert_data)

    try:
        balance = broker.get_balance()
    except:
        balance = 10000.0

    approved, reason = approve_trade(decision, balance)

    decision_id = log_decision(alert_data, decision, executed=approved, skip_reason=reason)

    # Log to session manager
    from risk_manager import in_killzone
    in_kz, kz_name = in_killzone()
    session = "london" if "London" in kz_name else "ny" if "NewYork" in kz_name else None
    if session:
        is_match = decision.get("action") in ["LONG", "SHORT"] and decision.get("score", 0) >= 80
        is_trade = approved and is_match
        session_manager.log_signal(session, is_match=is_match, is_trade=is_trade)

    msg = format_decision_report(decision, alert_data, approved, reason)
    threading.Thread(target=send_telegram_sync, args=(msg,), daemon=True).start()

    result = {}
    if approved:
        result = execute_trade(decision, alert_data, broker, decision_id)

    return {
        "status": "executed" if (approved and result.get("success")) else "skipped",
        "action": decision.get("action"),
        "score": decision.get("score"),
        "confidence": decision.get("confidence"),
        "approved": approved,
        "reason": reason,
        "rr_ratio": decision.get("rr_ratio"),
        "decision_id": decision_id,
        "execution": result
    }


def keep_alive_scheduler():
    """Ping self every 14 minutes to prevent Render.com free tier from sleeping"""
    print("[KEEPALIVE] Keep-alive scheduler started")
    port = int(os.getenv("PORT", "8000"))

    while True:
        try:
            time.sleep(14 * 60)  # 14 minutes
            import urllib.request
            url = f"http://localhost:{port}/health"
            try:
                req = urllib.request.Request(url)
                with urllib.request.urlopen(req, timeout=10):
                    print(f"[KEEPALIVE] Ping successful at {datetime.now(timezone.utc).isoformat()}")
            except Exception as e:
                print(f"[KEEPALIVE] Ping failed: {e}")
        except Exception as e:
            print(f"[KEEPALIVE] Scheduler error: {e}")
            time.sleep(60)


def proactive_scanner():
    """Proactively scan charts every 5 minutes and analyze for setup opportunities"""
    print("[SCANNER] Proactive chart scanner started")
    from risk_manager import in_killzone, is_killed
    from ai_brain import ask_claude
    from config import KILLZONES_LISBON

    SCAN_INTERVAL = 300  # 5 minutes
    SCAN_SYMBOLS = ["XAUUSD", "NAS100", "EURUSD", "GBPUSD"]

    while True:
        try:
            time.sleep(SCAN_INTERVAL)

            if is_killed():
                continue

            in_kz, kz_name = in_killzone()

            if not in_kz:
                continue

            print(f"[SCANNER] Active killzone: {kz_name}. Scanning {len(SCAN_SYMBOLS)} symbols...")

            for symbol in SCAN_SYMBOLS:
                try:
                    scan_data = {
                        "symbol": symbol,
                        "event": "proactive_scan",
                        "price": 0,
                        "timeframe": "5m",
                        "htf_trend": "pending",
                        "structure": "pending",
                        "fvg": "pending",
                        "session": kz_name,
                        "message": f"Proactive scan by DAVOOD HUNTER AI. Current session: {kz_name}. Looking for TRH Hunter Method setup. Check for: 1) Liquidity sweep, 2) Displacement candle, 3) FVG, 4) BOS confirmation, 5) SMT divergence. Only alert if HIGH probability setup found."
                    }

                    decision = ask_claude(scan_data)

                    if decision.get("action") in ["LONG", "SHORT"] and decision.get("score", 0) >= 80:
                        from telegram_alerts import send_telegram_sync
                        from risk_manager import approve_trade
                        from journal import log_decision

                        try:
                            balance = 10000.0
                        except:
                            balance = 10000.0

                        approved, reason = approve_trade(decision, balance)

                        if approved:
                            alert_msg = (
                                f"ALARM: TRADE OPPORTUNITY DETECTED\n"
                                f"----------------------------------------\n"
                                f"Symbol: {symbol}\n"
                                f"Direction: {decision['action']}\n"
                                f"Score: {decision.get('score', 0)}/100\n"
                                f"Confidence: {decision.get('confidence', 0)}%\n"
                                f"Entry: {decision.get('entry', 'N/A')}\n"
                                f"SL: {decision.get('sl', 'N/A')}\n"
                                f"TP: {decision.get('tp', 'N/A')}\n"
                                f"R:R: {decision.get('rr_ratio', 'N/A')}\n"
                                f"Session: {kz_name}\n"
                                f"----------------------------------------\n"
                                f"{decision.get('reasoning', '')[:200]}"
                            )
                            send_telegram_sync(alert_msg)
                            log_decision(scan_data, decision, executed=True, skip_reason="Proactive scan")
                            print(f"[SCANNER] TRADE ALERT sent for {symbol} {decision['action']}")
                        else:
                            print(f"[SCANNER] {symbol} {decision['action']} blocked: {reason}")
                    else:
                        print(f"[SCANNER] {symbol}: No setup (score={decision.get('score', 0)})")

                except Exception as e:
                    print(f"[SCANNER] Error scanning {symbol}: {e}")

        except Exception as e:
            print(f"[SCANNER] Scanner error: {e}")
            time.sleep(60)


def daily_report_scheduler():
    """Send daily report every day at 22:00 Lisbon time (21:00 UTC in summer, 22:00 UTC in winter)"""
    print("[REPORT] Daily report scheduler started")
    reported_today = None

    while True:
        try:
            now = datetime.now(timezone.utc)
            lisbon = timezone(timedelta(hours=1))
            now_lisbon = datetime.now(lisbon)
            today = now_lisbon.strftime("%Y-%m-%d")

            # Send report at 22:00 Lisbon time
            if now_lisbon.hour == 22 and reported_today != today:
                send_daily_report()
                reported_today = today
                print(f"[REPORT] Daily report sent for {today}")

            # Reset daily tracker at midnight
            if now_lisbon.hour == 0 and reported_today is not None:
                reported_today = None

            time.sleep(60)
        except Exception as e:
            print(f"[REPORT] Scheduler error: {e}")
            time.sleep(60)


def main():
    global broker

    print("╔══════════════════════════════════════════════════╗")
    print("║        DAVOOD HUNTER AI OS v1.0                 ║")
    print("║        Trading Room Hunter — TRH                ║")
    print(f"║        Paper Mode: {str(PAPER_MODE):<28}║")
    print("╚══════════════════════════════════════════════════╝")

    init_db()
    init_daily_report_table()
    broker = get_broker()

    # Check weekly size reduction
    update_weekly_size_reduction()

    # Start trade close poller
    start_trade_poller(broker)

    # Start Telegram bot
    start_bot()

    # Start daily report scheduler
    report_thread = threading.Thread(target=daily_report_scheduler, daemon=True)
    report_thread.start()
    print("[REPORT] Daily report scheduled for 22:00 Lisbon time")

    # Start session manager (narrates everything during London/NY)
    session_manager.start()
    print("[SESSION] Session manager started - will narrate all sessions")

    # Start keep-alive scheduler (prevents Render.com free tier from sleeping)
    keepalive_thread = threading.Thread(target=keep_alive_scheduler, daemon=True)
    keepalive_thread.start()
    print("[KEEPALIVE] Keep-alive scheduler started - will ping every 14 minutes")

    # Start proactive chart scanner (analyzes charts every 5 minutes)
    scanner_thread = threading.Thread(target=proactive_scanner, daemon=True)
    scanner_thread.start()
    print("[SCANNER] Proactive chart scanner started - will scan every 5 minutes")

    server = HTTPServer(("0.0.0.0", WEBHOOK_PORT), TRHHandler)
    print(f"\n[SERVER] Running on port {WEBHOOK_PORT}")
    print(f"[SERVER] Health: http://localhost:{WEBHOOK_PORT}/health")
    print(f"[SERVER] Status: http://localhost:{WEBHOOK_PORT}/status")
    print(f"[SERVER] Webhook: POST http://localhost:{WEBHOOK_PORT}/webhook")
    print(f"[SERVER] Kill:    POST http://localhost:{WEBHOOK_PORT}/kill")
    print("\n[SERVER] Waiting for TradingView webhooks... 🎯\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[SERVER] Stopped.")


if __name__ == "__main__":
    main()
