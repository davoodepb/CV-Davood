# ============================================================
#  DAVOOD HUNTER AI OS v1.0 — MAIN SERVER
#  Webhook → AI Brain → Risk Manager → Execution
#
#  Run: python main.py
# ============================================================

import json
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import urllib.parse

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

    decision = ask_claude(alert_data)

    try:
        balance = broker.get_balance()
    except:
        balance = 10000.0

    approved, reason = approve_trade(decision, balance)

    decision_id = log_decision(alert_data, decision, executed=approved, skip_reason=reason)

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


def main():
    global broker

    print("╔══════════════════════════════════════════════════╗")
    print("║        DAVOOD HUNTER AI OS v1.0                 ║")
    print("║        Trading Room Hunter — TRH                ║")
    print(f"║        Paper Mode: {str(PAPER_MODE):<28}║")
    print("╚══════════════════════════════════════════════════╝")

    init_db()
    broker = get_broker()

    # Check weekly size reduction
    update_weekly_size_reduction()

    # Start trade close poller
    start_trade_poller(broker)

    # Start Telegram bot
    start_bot()

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
