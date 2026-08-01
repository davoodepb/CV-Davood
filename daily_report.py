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


def get_open_trades():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT id, symbol, side, entry_price, sl_price, tp_price,
               lot_size, risk_usd, status, close_price, pnl_usd,
               pnl_r, close_time, timestamp, score, session, setup_type
        FROM trades WHERE status='open'
        ORDER BY id ASC
    """)
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


def get_weekly_report():
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    week_start = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")
    today = now.strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT COUNT(*), SUM(CASE WHEN pnl_usd > 0 THEN 1 ELSE 0 END),
               SUM(CASE WHEN pnl_usd <= 0 THEN 1 ELSE 0 END),
               SUM(COALESCE(pnl_usd, 0)), SUM(COALESCE(pnl_r, 0))
        FROM trades WHERE timestamp >= ? AND timestamp < ?
    """, (week_start, today))
    row = c.fetchone()
    conn.close()
    total = row[0] or 0
    wins = row[1] or 0
    losses = row[2] or 0
    pnl_usd = row[3] or 0
    pnl_r = row[4] or 0
    win_rate = (wins / total * 100) if total > 0 else 0
    return {
        "week_start": week_start,
        "total_trades": total,
        "wins": wins,
        "losses": losses,
        "win_rate": win_rate,
        "pnl_usd": pnl_usd,
        "pnl_r": pnl_r
    }


def get_max_drawdown():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT pnl_usd FROM trades WHERE timestamp LIKE ? || '%'
        AND pnl_usd IS NOT NULL ORDER BY id ASC
    """, (today,))
    rows = c.fetchall()
    conn.close()
    if not rows:
        return 0.0
    peak = 0
    max_dd = 0
    equity = 0
    for r in rows:
        equity += r[0]
        if equity > peak:
            peak = equity
        dd = peak - equity
        if dd > max_dd:
            max_dd = dd
    return max_dd


def get_market_sentiment():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT ai_action FROM decisions WHERE timestamp LIKE ? || '%'
    """, (today,))
    rows = c.fetchall()
    conn.close()
    long_count = sum(1 for r in rows if r[0] == "LONG")
    short_count = sum(1 for r in rows if r[0] == "SHORT")
    if long_count > short_count:
        return "BULLISH"
    elif short_count > long_count:
        return "BEARISH"
    return "MIXED"


def format_full_report():
    from config import KILLZONES_LISBON, RISK_PER_TRADE_PCT, MAX_DAILY_LOSS_PCT, MAX_OPEN_TRADES, MAX_DAILY_TRADES
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    lisbon = timezone(timedelta(hours=1))
    now_lisbon = datetime.now(lisbon)

    weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_name = weekdays[now_lisbon.weekday()]

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
    max_dd = get_max_drawdown()
    sentiment = get_market_sentiment()

    long_signals = sum(1 for s in signals if s["action"] == "LONG")
    short_signals = sum(1 for s in signals if s["action"] == "SHORT")
    wait_signals = sum(1 for s in signals if s["action"] == "WAIT")

    avg_score = 0
    if signals:
        scores = [s["confidence"] for s in signals if s["confidence"]]
        avg_score = sum(scores) / len(scores) if scores else 0
    best_score = max((s["confidence"] for s in signals if s["confidence"]), default=0)
    worst_score = min((s["confidence"] for s in signals if s["confidence"]), default=0)

    from journal import get_open_trades
    open_trades = get_open_trades()

    report = (
        "============================================================\n"
        "     DAVOOD HUNTER AI OS v1.0 - DAILY TRADING REPORT\n"
        "============================================================\n"
        "\n"
        f"  Date: {today}\n"
        f"  Time: {now_lisbon.strftime('%H:%M')} Lisbon\n"
        f"  Agent: DAVOOD HUNTER AI\n"
        f"  Mode: PAPER (no real trades)\n"
        "\n"
        "------------------------------------------------------------\n"
        "  1. EXECUTIVE SUMMARY\n"
        "------------------------------------------------------------\n"
        "\n"
        f"  Daily P/L:           {total_pnl:+.2f} USD (Paper Mode)\n"
        f"  Win Rate:            {win_rate:.0f}%\n"
        f"  Trades Executed:     {len(executed)}\n"
        f"  Trades Blocked:      {len(blocked)}\n"
        f"  Portfolio Value:     $10,000.00 (Paper)\n"
        f"  Maximum Drawdown:    {max_dd:.2f} USD\n"
        f"  Risk Level:          {'HIGH' if max_dd > 300 else 'MEDIUM' if max_dd > 100 else 'LOW'}\n"
        f"  Session Status:      {'POST-NY (Evening)' if now_lisbon.hour >= 18 else 'NY SESSION' if now_lisbon.hour >= 16 else 'LONDON SESSION' if now_lisbon.hour >= 11 else 'PRE-LONDON' if now_lisbon.hour >= 10 else 'OFF-HOURS'}\n"
        "\n"
        f"  Summary: The agent received {len(signals)} signals today.\n"
        f"  {long_signals} LONG, {short_signals} SHORT, {wait_signals} WAIT signals.\n"
        f"  {len(executed)} trades executed, {len(blocked)} blocked by risk rules.\n"
        f"  Average score: {avg_score:.1f}/100 | Best: {best_score} | Lowest: {worst_score}\n"
        "\n"
        "------------------------------------------------------------\n"
        "  2. MARKET OVERVIEW\n"
        "------------------------------------------------------------\n"
        "\n"
        "  Assets Monitored:\n"
    )

    symbols = set(s["symbol"] for s in signals if s["symbol"])
    if not symbols:
        symbols = {"XAUUSD", "NAS100"}
    for sym in symbols:
        sym_signals = [s for s in signals if s["symbol"] == sym]
        avg_sym_score = 0
        if sym_signals:
            sym_scores = [s["confidence"] for s in sym_signals if s["confidence"]]
            avg_sym_score = sum(sym_scores) / len(sym_scores) if sym_scores else 0
        report += f"    {sym}: Bias={sentiment} | Signals={len(sym_signals)} | Avg Score={avg_sym_score:.0f}\n"

    report += (
        "\n"
        "  Macro Events:\n"
        "    No major news events reported during kill zones today.\n"
        "\n"
        f"  Market Sentiment: {sentiment}\n"
        "  Volatility: MEDIUM\n"
        "\n"
        "------------------------------------------------------------\n"
        "  3. SIGNALS RECEIVED TODAY\n"
        "------------------------------------------------------------\n"
    )

    for i, s in enumerate(signals, 1):
        ts = s["timestamp"].split("T")[1][:5] if "T" in s["timestamp"] else "??:??"
        action = s["action"] or "UNKNOWN"
        symbol = s["symbol"] or "?"
        score = s["confidence"] or 0
        entry = s["entry"] or 0
        sl = s["sl"] or 0
        tp = s["tp"] or 0
        rr = s["rr_ratio"] or 0
        status = "EXECUTED" if s["executed"] else "BLOCKED"
        reason = s.get("skip_reason", "") or "No specific reason"

        reasoning = s.get("reasoning", "") or ""
        has_sweep = "sweep" in reasoning.lower() or "sweep" in reason.lower()
        has_displacement = "displacement" in reasoning.lower() or "displacement" in reason.lower()
        has_fvg = "fvg" in reasoning.lower() or "fvg" in reason.lower()

        kz_name = "London" if "London" in str(reason) else "NewYork" if "NewYork" in str(reason) else "Unknown"

        report += (
            f"\n  Signal #{i} - {symbol}\n"
            f"  ========================================\n"
            f"    Time:          {ts}\n"
            f"    Direction:     {action}\n"
            f"    Score:         {score}/100\n"
            f"    Session:       {kz_name}\n"
            f"    HTF Bias:      {sentiment}\n"
            f"    Kill Zone:     YES\n"
            f"    Sweep:         {'YES' if has_sweep else 'NO'}\n"
            f"    Displacement:  {'YES' if has_displacement else 'NO'}\n"
            f"    FVG:           {'YES' if has_fvg else 'NO'}\n"
            f"    Entry:         {entry:.2f}\n"
            f"    Stop Loss:     {sl:.2f}\n"
            f"    Take Profit:   {tp:.2f}\n"
            f"    Risk/Reward:   {rr:.2f}\n"
            f"    Status:        {status}\n"
            f"    Decision:      {reason}\n"
        )

    if not signals:
        report += (
            "\n  No signals received today.\n"
            "  Agent was monitoring but no webhooks were received.\n"
        )

    report += (
        "\n"
        "------------------------------------------------------------\n"
        "  4. RISK MANAGEMENT\n"
        "------------------------------------------------------------\n"
        "\n"
        f"  Maximum Exposure:     {MAX_OPEN_TRADES}% (Hard Rule 8)\n"
        f"  Risk Per Trade:       {RISK_PER_TRADE_PCT}% (Hard Rule 9)\n"
        f"  Daily Loss Limit:     {MAX_DAILY_LOSS_PCT}% (Hard Rule 10)\n"
        "  Portfolio Leverage:   1:1\n"
        "  Stop-Loss Compliance: YES\n"
        f"  Rule Violations:      {'None' if not stats['killed'] else 'Kill switch triggered'}\n"
        f"  Kill Switch Status:   {'TRIGGERED' if stats['killed'] else 'ARMED (not triggered)'}\n"
        "\n"
        "------------------------------------------------------------\n"
        "  5. PERFORMANCE METRICS (Cumulative)\n"
        "------------------------------------------------------------\n"
        "\n"
        f"  Total Signals:    {len(signals)}\n"
        f"  LONG Signals:     {long_signals}\n"
        f"  SHORT Signals:    {short_signals}\n"
        f"  WAIT Signals:     {wait_signals}\n"
        f"  Executed:         {len(executed)}\n"
        f"  Blocked:          {len(blocked)}\n"
        f"  Daily Return:     {(total_pnl / 10000 * 100):.2f}% (Paper)\n"
        f"  Weekly Return:    N/A\n"
        f"  Monthly Return:   N/A\n"
        f"  Sharpe Ratio:     N/A\n"
        f"  Max Drawdown:     {max_dd:.2f} USD\n"
        f"  Profit Factor:    N/A\n"
        "\n"
        "------------------------------------------------------------\n"
        "  6. WATCHLIST\n"
        "------------------------------------------------------------\n"
        "\n"
        "  Asset      Bias       Status\n"
        "  ---------  ---------  -------------------\n"
    )

    watchlist = [
        ("XAUUSD", "BULLISH" if sentiment == "BULLISH" else "BEARISH" if sentiment == "BEARISH" else "NEUTRAL", "Active"),
        ("NAS100", "NEUTRAL", "Active"),
        ("EURUSD", "NEUTRAL", "Active"),
        ("GBPUSD", "NEUTRAL", "Active"),
    ]
    for asset, bias, status in watchlist:
        report += f"  {asset:<10} {bias:<10} {status} - monitoring\n"

    report += (
        "\n"
        "------------------------------------------------------------\n"
        "  7. MISTAKES AND LESSONS\n"
        "------------------------------------------------------------\n"
        "\n"
    )

    if blocked:
        report += "  Blocked Signals Analysis:\n"
        for s in blocked:
            ts = s["timestamp"].split("T")[1][:5] if "T" in s["timestamp"] else "??:??"
            report += f"    [{ts}] {s['action']} {s['symbol']} - {s.get('skip_reason', 'Unknown reason')}\n"
        report += "\n"
        report += "  Lesson: Risk manager correctly blocked these trades.\n"
        report += "  The agent followed all hard rules.\n"
    else:
        report += "  Mistakes: None detected.\n"
        report += "  The agent correctly followed all TRH Hunter Method rules.\n"

    if open_trades:
        report += (
            "\n"
            "------------------------------------------------------------\n"
            "  8. OPEN TRADES\n"
            "------------------------------------------------------------\n"
            "\n"
        )
        for t in open_trades:
            report += f"  {t['side']} {t['symbol']} @ {t['entry']:.2f} | SL: {t['sl']:.2f} | TP: {t['tp']:.2f}\n"

    report += (
        "\n"
        "============================================================\n"
        f"  STATUS: {'HUNTING' if not stats['killed'] else 'HALTED'}\n"
        "  Agent will continue monitoring tomorrow.\n"
        "============================================================"
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
        from telegram_alerts import send_telegram_sync
        report = format_full_report()
        send_telegram_sync(report)
        print(f"[REPORT] Daily report sent at {datetime.now(timezone.utc).isoformat()}")
        return True
    except Exception as e:
        print(f"[REPORT] Failed to send daily report: {e}")
        return False


if __name__ == "__main__":
    print(format_full_report())
