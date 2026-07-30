# ============================================================
#  DAVOOD HUNTER AI OS v1.0 — TRADE JOURNAL
#  SQLite database for all decisions, trades, stats
#  Enriched with full TRH Hunter Method tracking
# ============================================================

import sqlite3
import json
from datetime import datetime, timezone, timedelta
from config import DB_PATH


def init_db():
    """Create tables if they don't exist. Migrate schema if needed."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS decisions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp   TEXT NOT NULL,
            symbol      TEXT,
            event_type  TEXT,
            alert_data  TEXT,
            ai_action   TEXT,
            ai_confidence INTEGER,
            ai_entry    REAL,
            ai_sl       REAL,
            ai_tp       REAL,
            ai_rr       REAL,
            ai_reasoning TEXT,
            executed    INTEGER DEFAULT 0,
            skip_reason TEXT
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS trades (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            decision_id     INTEGER,
            timestamp       TEXT NOT NULL,
            symbol          TEXT,
            side            TEXT,
            entry_price     REAL,
            sl_price        REAL,
            tp_price        REAL,
            lot_size        REAL,
            risk_usd        REAL,
            status          TEXT DEFAULT 'open',
            close_price     REAL,
            pnl_usd         REAL,
            pnl_r           REAL,
            close_time      TEXT,
            score           INTEGER,
            session         TEXT,
            setup_type      TEXT,
            soft_rules      TEXT,
            sweep_level     REAL,
            confirmation    TEXT,
            htf_bias        TEXT,
            killzone        TEXT,
            reasoning       TEXT,
            similar_trade   TEXT,
            risk_assessment TEXT,
            FOREIGN KEY(decision_id) REFERENCES decisions(id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS daily_stats (
            date        TEXT PRIMARY KEY,
            total_trades INTEGER DEFAULT 0,
            wins        INTEGER DEFAULT 0,
            losses      INTEGER DEFAULT 0,
            pnl_usd     REAL DEFAULT 0,
            pnl_r       REAL DEFAULT 0,
            killed      INTEGER DEFAULT 0
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS weekly_stats (
            week_start  TEXT PRIMARY KEY,
            total_trades INTEGER DEFAULT 0,
            wins        INTEGER DEFAULT 0,
            losses      INTEGER DEFAULT 0,
            pnl_usd     REAL DEFAULT 0,
            pnl_r       REAL DEFAULT 0,
            win_rate    REAL DEFAULT 0,
            avg_rr      REAL DEFAULT 0
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS loss_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp   TEXT NOT NULL,
            pnl_usd     REAL,
            trade_id    INTEGER
        )
    """)

    conn.commit()
    conn.close()
    print("[DB] Journal initialized with full TRH schema.")


def log_decision(alert_data: dict, decision: dict, executed: bool, skip_reason: str = "") -> int:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    c.execute("""
        INSERT INTO decisions
        (timestamp, symbol, event_type, alert_data, ai_action, ai_confidence,
         ai_entry, ai_sl, ai_tp, ai_rr, ai_reasoning, executed, skip_reason)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        now,
        alert_data.get("symbol"),
        alert_data.get("event"),
        json.dumps(alert_data),
        decision.get("action"),
        decision.get("confidence"),
        decision.get("entry"),
        decision.get("sl"),
        decision.get("tp"),
        decision.get("rr_ratio"),
        decision.get("reasoning"),
        1 if executed else 0,
        skip_reason
    ))
    row_id = c.lastrowid
    conn.commit()
    conn.close()
    return row_id


def log_trade_open(decision_id: int, symbol: str, side: str,
                   entry: float, sl: float, tp: float,
                   lot_size: float, risk_usd: float,
                   score: int = None, session: str = None,
                   setup_type: str = None, soft_rules: list = None,
                   sweep_level: float = None, confirmation: str = None,
                   htf_bias: str = None, killzone: str = None,
                   reasoning: str = None, similar_trade: str = None,
                   risk_assessment: str = None) -> int:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    c.execute("""
        INSERT INTO trades
        (decision_id, timestamp, symbol, side, entry_price, sl_price, tp_price,
         lot_size, risk_usd, score, session, setup_type, soft_rules,
         sweep_level, confirmation, htf_bias, killzone, reasoning,
         similar_trade, risk_assessment)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (decision_id, now, symbol, side,
          entry, sl, tp, lot_size, risk_usd,
          score, session, setup_type,
          json.dumps(soft_rules) if soft_rules else None,
          sweep_level, confirmation, htf_bias, killzone,
          reasoning, similar_trade, risk_assessment))
    trade_id = c.lastrowid
    conn.commit()
    conn.close()
    return trade_id


def log_trade_close(trade_id: int, close_price: float, pnl_usd: float, pnl_r: float):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()

    c.execute("""
        UPDATE trades SET status='closed', close_price=?, pnl_usd=?, pnl_r=?, close_time=?
        WHERE id=?
    """, (close_price, pnl_usd, pnl_r, now, trade_id))

    # Update daily stats
    today = now[:10]
    c.execute("""
        INSERT INTO daily_stats(date) VALUES(?) ON CONFLICT(date) DO NOTHING
    """, (today,))
    c.execute("""
        UPDATE daily_stats SET
            total_trades = total_trades + 1,
            wins  = wins  + ?,
            losses= losses+ ?,
            pnl_usd = pnl_usd + ?,
            pnl_r   = pnl_r   + ?
        WHERE date=?
    """, (1 if pnl_usd > 0 else 0, 1 if pnl_usd <= 0 else 0,
          pnl_usd, pnl_r, today))

    # Update weekly stats
    dt = datetime.now(timezone.utc)
    week_start = (dt - timedelta(days=dt.weekday())).strftime("%Y-%m-%d")
    c.execute("""
        INSERT INTO weekly_stats(week_start) VALUES(?) ON CONFLICT(week_start) DO NOTHING
    """, (week_start,))
    c.execute("""
        UPDATE weekly_stats SET
            total_trades = total_trades + 1,
            wins  = wins  + ?,
            losses= losses+ ?,
            pnl_usd = pnl_usd + ?,
            pnl_r   = pnl_r   + ?
        WHERE week_start=?
    """, (1 if pnl_usd > 0 else 0, 1 if pnl_usd <= 0 else 0,
          pnl_usd, pnl_r, week_start))

    # Update win rate and avg RR
    c.execute("""
        UPDATE weekly_stats SET win_rate = CASE WHEN total_trades > 0 THEN (wins * 100.0 / total_trades) ELSE 0 END
        WHERE week_start=?
    """, (week_start,))

    # Log loss for revenge pause tracking
    if pnl_usd <= 0:
        log_last_loss_time(pnl_usd=pnl_usd, trade_id=trade_id)

    conn.commit()
    conn.close()


def log_last_loss_time(pnl_usd: float = 0, trade_id: int = None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    c.execute("""
        INSERT INTO loss_log (timestamp, pnl_usd, trade_id) VALUES (?, ?, ?)
    """, (now, pnl_usd, trade_id))
    conn.commit()
    conn.close()


def get_last_loss_time() -> str:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT timestamp FROM loss_log ORDER BY id DESC LIMIT 1")
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    return row[0]


def get_daily_pnl_pct(account_balance: float) -> float:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT pnl_usd FROM daily_stats WHERE date=?", (today,))
    row = c.fetchone()
    conn.close()
    if not row:
        return 0.0
    return (row[0] / account_balance) * 100


def get_weekly_pnl_pct(account_balance: float) -> float:
    dt = datetime.now(timezone.utc)
    week_start = (dt - timedelta(days=dt.weekday())).strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT pnl_usd FROM weekly_stats WHERE week_start=?", (week_start,))
    row = c.fetchone()
    conn.close()
    if not row:
        return 0.0
    return (row[0] / account_balance) * 100


def get_monthly_pnl_pct(account_balance: float) -> float:
    dt = datetime.now(timezone.utc)
    month_start = dt.strftime("%Y-%m-01")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT SUM(pnl_usd) FROM daily_stats WHERE date >= ?", (month_start,))
    row = c.fetchone()
    conn.close()
    if not row or row[0] is None:
        return 0.0
    return (row[0] / account_balance) * 100


def get_daily_trade_count() -> int:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT total_trades FROM daily_stats WHERE date=?", (today,))
    row = c.fetchone()
    conn.close()
    if not row:
        return 0
    return row[0]


def get_open_trade_count() -> int:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM trades WHERE status='open'")
    count = c.fetchone()[0]
    conn.close()
    return count


def get_consecutive_losing_weeks() -> int:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT week_start, pnl_usd FROM weekly_stats ORDER BY week_start DESC LIMIT 4")
    rows = c.fetchall()
    conn.close()
    count = 0
    for row in rows:
        if row[1] < 0:
            count += 1
        else:
            break
    return count


def get_recent_decisions(limit: int = 10) -> list:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT ai_action, ai_confidence, ai_entry, ai_sl, ai_tp,
               ai_rr, ai_reasoning, executed, skip_reason, timestamp
        FROM decisions ORDER BY id DESC LIMIT ?
    """, (limit,))
    rows = c.fetchall()
    conn.close()
    results = []
    for r in rows:
        results.append({
            "action": r[0], "confidence": r[1], "entry": r[2],
            "sl": r[3], "tp": r[4], "rr_ratio": r[5],
            "reasoning": r[6], "executed": bool(r[7]),
            "skip_reason": r[8], "timestamp": r[9]
        })
    return results


def get_open_trades() -> list:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT id, symbol, side, entry_price, sl_price, tp_price,
               lot_size, risk_usd, timestamp
        FROM trades WHERE status='open' ORDER BY id DESC
    """)
    rows = c.fetchall()
    conn.close()
    results = []
    for r in rows:
        results.append({
            "id": r[0], "symbol": r[1], "side": r[2],
            "entry": r[3], "sl": r[4], "tp": r[5],
            "lot_size": r[6], "risk_usd": r[7], "timestamp": r[8]
        })
    return results


def get_weekly_report() -> dict:
    dt = datetime.now(timezone.utc)
    week_start = (dt - timedelta(days=dt.weekday())).strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM weekly_stats WHERE week_start=?", (week_start,))
    row = c.fetchone()
    conn.close()
    if not row:
        return {"week_start": week_start, "total_trades": 0, "wins": 0, "losses": 0,
                "pnl_usd": 0, "pnl_r": 0, "win_rate": 0}
    return {
        "week_start": row[0], "total_trades": row[1], "wins": row[2],
        "losses": row[3], "pnl_usd": row[4], "pnl_r": row[5], "win_rate": row[6]
    }


def update_weekly_win_rate():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        UPDATE weekly_stats SET win_rate = CASE
            WHEN total_trades > 0 THEN (wins * 100.0 / total_trades)
            ELSE 0 END
    """)
    conn.commit()
    conn.close()
