# ============================================================
#  DAVOOD HUNTER AI OS v1.0 — DAILY REPORT GENERATOR
#  Sends daily summary at end of NY session (16:30 Lisbon)
# ============================================================

import json
import sqlite3
from datetime import datetime, timezone, timedelta
from config import DB_PATH, TELEGRAM_TOKEN, TELEGRAM_CHAT_ID

import urllib.request


def get_daily_trades(date_str: str = None) -> list:
    if date_str is None:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("""
            SELECT * FROM decisions
            WHERE date(timestamp) = ?
            ORDER BY id
        """, (date_str,))
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        print(f"[REPORT] DB error: {e}")
        return []


def get_daily_stats(date_str: str = None) -> dict:
    if date_str is None:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    trades = get_daily_trades(date_str)
    total = len(trades)
    longs = sum(1 for t in trades if t.get("action") == "LONG")
    shorts = sum(1 for t in trades if t.get("action") == "SHORT")
    waits = sum(1 for t in trades if t.get("action") == "WAIT")
    executed = sum(1 for t in trades if t.get("executed"))
    blocked = total - executed
    avg_score = sum((t.get("score") or 0) for t in trades) / total if total > 0 else 0
    avg_rr = sum((t.get("rr_ratio") or 0) for t in trades if t.get("rr_ratio")) / max(1, sum(1 for t in trades if t.get("rr_ratio")))

    return {
        "date": date_str,
        "total_signals": total,
        "long_signals": longs,
        "short_signals": shorts,
        "wait_signals": waits,
        "executed": executed,
        "blocked": blocked,
        "avg_score": round(avg_score, 1),
        "avg_rr": round(avg_rr, 2),
        "trades": trades
    }


def format_report(stats: dict) -> str:
    lines = []
    lines.append(f"📊 DAVOOD HUNTER AI — DAILY REPORT")
    lines.append(f"📅 {stats['date']}")
    lines.append("━━━━━━━━━━━━━━━━━━━━━━━━━━")
    lines.append("")
    lines.append(f"📡 Signals Received: {stats['total_signals']}")
    lines.append(f"  🟢 LONG:  {stats['long_signals']}")
    lines.append(f"  🔴 SHORT: {stats['short_signals']}")
    lines.append(f"  ⏸ WAIT:   {stats['wait_signals']}")
    lines.append("")
    lines.append(f"✅ Executed: {stats['executed']}")
    lines.append(f"🚫 Blocked:  {stats['blocked']}")
    lines.append(f"📊 Avg Score: {stats['avg_score']}/100")
    lines.append(f"📐 Avg R:R: {stats['avg_rr']}")
    lines.append("")

    # Show each signal
    if stats["trades"]:
        lines.append("━━━━━━━━━━━━━━━━━━━━━━━━━━")
        lines.append("📋 ALL SIGNALS TODAY:")
        lines.append("")
        for i, t in enumerate(stats["trades"], 1):
            action = t.get("action", "?")
            score = t.get("score", 0) or 0
            symbol = t.get("symbol", "?")
            ts = t.get("timestamp", "")
            # Extract time from timestamp
            try:
                time_str = ts.split("T")[1][:5]
            except:
                time_str = "??:??"
            reason = t.get("skip_reason", "") or t.get("reasoning", "")[:60]
            emoji = "🟢" if action == "LONG" else "🔴" if action == "SHORT" else "⏸"
            lines.append(f"  {i}. {emoji} {action} {symbol} | Score: {score} | {time_str}")
            if reason:
                lines.append(f"     → {reason}")

    lines.append("")
    lines.append("━━━━━━━━━━━━━━━━━━━━━━━━━━")
    lines.append("🦁 DAVOOD HUNTER AI OS v1.0")
    lines.append("Paper Mode — No real trades")

    return "\n".join(lines)


def send_report_telegram(report: str) -> bool:
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        return False
    if "YOUR_" in TELEGRAM_TOKEN:
        return False

    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
        payload = json.dumps({
            "chat_id": TELEGRAM_CHAT_ID,
            "text": report,
            "parse_mode": "HTML"
        }).encode()

        req = urllib.request.Request(url, data=payload,
            headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=15) as r:
            result = json.loads(r.read())
            return result.get("ok", False)
    except Exception as e:
        print(f"[REPORT] Telegram error: {e}")
        return False


def save_report_to_file(report: str, date_str: str = None):
    if date_str is None:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"report_{date_str}.txt"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"[REPORT] Saved to {filename}")


def generate_daily_report():
    stats = get_daily_stats()
    report = format_report(stats)
    save_report_to_file(report, stats["date"])
    send_report_telegram(report)
    print(report)
    return report


if __name__ == "__main__":
    generate_daily_report()
