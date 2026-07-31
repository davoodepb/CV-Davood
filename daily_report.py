# ============================================================
#  DAVOOD HUNTER AI OS v1.0 — DAILY REPORT
#  Generates daily activity reports and sends via Telegram
# ============================================================

import sqlite3
import json
from datetime import datetime, timezone, timedelta
from config import DB_PATH


def init_daily_report_table():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS daily_reports (
            date TEXT PRIMARY KEY,
            report_text TEXT,
            sent_at TEXT
        )
    """)
    conn.commit()
    conn.close()


def get_today_signals():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT ai_action, ai_confidence, ai_entry, ai_sl, ai_tp,
               ai_rr, ai_reasoning, executed, skip_reason, timestamp, symbol
        FROM decisions WHERE timestamp LIKE ? || '%'
        ORDER BY id ASC
    """, (today,))
    rows = c.fetchall()
    conn.close()
    results = []
    for r in rows:
        results.append({
            "action": r[0], "confidence": r[1], "entry": r[2],
            "sl": r[3], "tp": r[4], "rr_ratio": r[5],
            "reasoning": r[6], "executed": bool(r[7]),
            "skip_reason": r[8], "timestamp": r[9], "symbol": r[10]
        })
    return results


def get_today_trades():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT id, symbol, side, entry_price, sl_price, tp_price,
               lot_size, risk_usd, status, close_price, pnl_usd,
               pnl_r, close_time, timestamp, score, session, setup_type
        FROM trades WHERE timestamp LIKE ? || '%'
        ORDER BY id ASC
    """, (today,))
    rows = c.fetchall()
    conn.close()
    results = []
    for r in rows:
        results.append({
            "id": r[0], "symbol": r[1], "side": r[2],
            "entry": r[3], "sl": r[4], "tp": r[5],
            "lot_size": r[6], "risk_usd": r[7], "status": r[8],
            "close_price": r[9], "pnl_usd": r[10],
            "pnl_r": r[11], "close_time": r[12], "timestamp": r[13],
            "score": r[14], "session": r[15], "setup_type": r[16]
        })
    return results


def get_today_stats():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM daily_stats WHERE date=?", (today,))
    row = c.fetchone()
    conn.close()
    if not row:
        return {
            "date": today, "total_trades": 0, "wins": 0,
            "losses": 0, "pnl_usd": 0, "pnl_r": 0, "killed": False
        }
    return {
        "date": row[0], "total_trades": row[1], "wins": row[2],
        "losses": row[3], "pnl_usd": row[4], "pnl_r": row[5],
        "killed": bool(row[6])
    }


def format_full_report():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    lisbon = timezone(timedelta(hours=1))
    now_lisbon = datetime.now(lisbon)

    signals = get_today_signals()
    trades = get_today_trades()
    stats = get_today_stats()

    executed = [s for s in signals if s["executed"]]
    blocked = [s for s in signals if not s["executed"]]
    wins = [t for t in trades if t["pnl_usd"] and t["pnl_usd"] > 0]
    losses = [t for t in trades if t["pnl_usd"] and t["pnl_usd"] <= 0]

    total_pnl = sum(t["pnl_usd"] for t in trades if t["pnl_usd"])
    total_pnl_r = sum(t["pnl_r"] for t in trades if t["pnl_r"])
    win_rate = (len(wins) / len(trades) * 100) if trades else 0

    report = (
        f"DAVOOD HUNTER AI - DAILY REPORT\n"
        f"Date: {today}\n"
        f"Time: {now_lisbon.strftime('%H:%M')} Lisbon\n"
        f"----------------------------------------\n"
    )

    # Kill status
    if stats["killed"]:
        report += "KILL SWITCH: ARMED\n"
    else:
        report += "KILL SWITCH: OK\n"

    # Signals section
    report += (
        f"\nSIGNALS RECEIVED: {len(signals)}\n"
        f"  Executed: {len(executed)}\n"
        f"  Blocked:  {len(blocked)}\n"
    )

    for s in signals:
        ts = s["timestamp"].split("T")[1][:5] if "T" in s["timestamp"] else "??:??"
        action = s["action"] or "UNKNOWN"
        symbol = s["symbol"] or "?"
        score = s["confidence"] or 0
        status = "EXECUTED" if s["executed"] else "BLOCKED"
        reason = s.get("skip_reason", "") or ""

        report += f"  [{ts}] {action} {symbol} | Score: {score} | {status}"
        if reason:
            report += f" ({reason})"
        report += "\n"

    # Trades section
    report += (
        f"\nTRADES TODAY: {len(trades)}\n"
        f"  Wins:   {len(wins)}\n"
        f"  Losses: {len(losses)}\n"
        f"  Win Rate: {win_rate:.0f}%\n"
        f"  P/L: {total_pnl:+.2f} USD ({total_pnl_r:+.1f}R)\n"
    )

    for t in trades:
        ts = t["timestamp"].split("T")[1][:5] if "T" in t["timestamp"] else "??:??"
        side = t["side"] or "?"
        symbol = t["symbol"] or "?"
        entry = t["entry"] or 0
        status = t["status"] or "open"
        score = t["score"] or 0
        pnl = t["pnl_usd"] or 0
        pnl_r = t["pnl_r"] or 0

        report += f"  [{ts}] {side} {symbol} @ {entry:.2f} | Score: {score} | {status}"
        if pnl != 0:
            report += f" | P/L: {pnl:+.2f} ({pnl_r:+.1f}R)"
        report += "\n"

    # Open trades
    from journal import get_open_trades
    open_trades = get_open_trades()
    if open_trades:
        report += (
            f"\nOPEN TRADES: {len(open_trades)}\n"
        )
        for t in open_trades:
            report += f"  {t['side']} {t['symbol']} @ {t['entry']:.2f} | SL: {t['sl']:.2f} | TP: {t['tp']:.2f}\n"

    # Summary
    report += (
        f"\n----------------------------------------\n"
        f"STATUS: {'HUNTING' if not stats['killed'] else 'HALTED'}\n"
        f"Mode: PAPER\n"
        f"----------------------------------------"
    )

    return report


def format_weekly_summary():
    from journal import get_weekly_report
    report = get_weekly_report()

    msg = (
        f"WEEKLY SUMMARY\n"
        f"----------------------------------------\n"
        f"Week: {report['week_start']}\n"
        f"Trades: {report['total_trades']}\n"
        f"Wins: {report['wins']} | Losses: {report['losses']}\n"
        f"Win Rate: {report['win_rate']:.0f}%\n"
        f"P/L: {report['pnl_usd']:+.2f} USD ({report['pnl_r']:+.1f}R)\n"
        f"----------------------------------------"
    )
    return msg


def send_daily_report():
    try:
        from telegram_alerts import send_message
        report = format_full_report()
        send_message(report)
        print(f"[REPORT] Daily report sent at {datetime.now(timezone.utc).isoformat()}")
        return True
    except Exception as e:
        print(f"[REPORT] Failed to send daily report: {e}")
        return False


if __name__ == "__main__":
    print(format_full_report())
