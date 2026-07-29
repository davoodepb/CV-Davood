# ============================================================
#  DAVOOD HUNTER AI OS v1.0 — TRADE JOURNAL
#  SQLite database — Records every decision and trade
# ============================================================

import sqlite3
import json
from datetime import datetime, timezone
from config import DB_PATH


def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS decisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            symbol TEXT,
            event TEXT,
            price REAL,
            session TEXT,
            action TEXT,
            score INTEGER,
            confidence INTEGER,
            entry REAL,
            sl REAL,
            tp REAL,
            rr_ratio REAL,
            killzone_active INTEGER,
            sweep_confirmed INTEGER,
            displacement_confirmed INTEGER,
            htf_bias TEXT,
            reasoning TEXT,
            reject_reasons TEXT,
            soft_rules TEXT,
            executed INTEGER DEFAULT 0,
            skip_reason TEXT,
            decision_json TEXT
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            decision_id INTEGER,
            timestamp TEXT NOT NULL,
            symbol TEXT,
            direction TEXT,
            session TEXT,
            entry_price REAL,
            stop_loss REAL,
            take_profit REAL,
            lot_size REAL,
            risk_usd REAL,
            exit_price REAL,
            pnl REAL,
            result TEXT,
            opened_at TEXT,
            closed_at TEXT,
            score INTEGER,
            notes TEXT,
            FOREIGN KEY (decision_id) REFERENCES decisions(id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS daily_summary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT UNIQUE NOT NULL,
            total_trades INTEGER DEFAULT 0,
            wins INTEGER DEFAULT 0,
            losses INTEGER DEFAULT 0,
            total_pnl REAL DEFAULT 0,
            win_rate REAL DEFAULT 0,
            best_trade REAL DEFAULT 0,
            worst_trade REAL DEFAULT 0,
            notes TEXT
        )
    """)

    conn.commit()
    conn.close()
    print(f"[JOURNAL] Database ready: {DB_PATH}")


def log_decision(alert_data: dict, decision: dict, executed: bool = False, skip_reason: str = "") -> int:
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        c.execute("""
            INSERT INTO decisions (
                timestamp, symbol, event, price, session, action, score,
                confidence, entry, sl, tp, rr_ratio, killzone_active,
                sweep_confirmed, displacement_confirmed, htf_bias,
                reasoning, reject_reasons, soft_rules, executed, skip_reason,
                decision_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            datetime.now(timezone.utc).isoformat(),
            alert_data.get("symbol"),
            alert_data.get("event"),
            alert_data.get("price"),
            alert_data.get("session"),
            decision.get("action"),
            decision.get("score"),
            decision.get("confidence"),
            decision.get("entry"),
            decision.get("sl"),
            decision.get("tp"),
            decision.get("rr_ratio"),
            1 if decision.get("killzone_active") else 0,
            1 if decision.get("sweep_confirmed") else 0,
            1 if decision.get("displacement_confirmed") else 0,
            decision.get("htf_bias"),
            decision.get("reasoning", ""),
            json.dumps(decision.get("reject_reasons", [])),
            json.dumps(decision.get("soft_rules_present", [])),
            1 if executed else 0,
            skip_reason,
            json.dumps(decision, ensure_ascii=False)
        ))

        conn.commit()
        decision_id = c.lastrowid
        conn.close()
        print(f"[JOURNAL] Decision #{decision_id} logged: {decision.get('action')} score={decision.get('score')}")
        return decision_id

    except Exception as e:
        print(f"[JOURNAL] Error logging decision: {e}")
        return 0


def log_trade(decision_id: int, trade_data: dict) -> int:
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        c.execute("""
            INSERT INTO trades (
                decision_id, timestamp, symbol, direction, session,
                entry_price, stop_loss, take_profit, lot_size, risk_usd,
                exit_price, pnl, result, opened_at, closed_at, score, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            decision_id,
            datetime.now(timezone.utc).isoformat(),
            trade_data.get("symbol"),
            trade_data.get("direction"),
            trade_data.get("session"),
            trade_data.get("entry"),
            trade_data.get("sl"),
            trade_data.get("tp"),
            trade_data.get("lot_size"),
            trade_data.get("risk_usd"),
            trade_data.get("exit_price"),
            trade_data.get("pnl"),
            trade_data.get("result", "OPEN"),
            trade_data.get("opened_at"),
            trade_data.get("closed_at"),
            trade_data.get("score"),
            trade_data.get("notes", "")
        ))

        conn.commit()
        trade_id = c.lastrowid
        conn.close()
        print(f"[JOURNAL] Trade #{trade_id} logged")
        return trade_id

    except Exception as e:
        print(f"[JOURNAL] Error logging trade: {e}")
        return 0


def get_daily_summary(date_str: str = None) -> dict:
    if date_str is None:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        c.execute("""
            SELECT COUNT(*), SUM(CASE WHEN result='WIN' THEN 1 ELSE 0 END),
                   SUM(CASE WHEN result='LOSS' THEN 1 ELSE 0 END),
                   SUM(pnl), MAX(pnl), MIN(pnl)
            FROM trades WHERE date(opened_at) = ?
        """, (date_str,))

        row = c.fetchone()
        conn.close()

        total = row[0] or 0
        wins = row[1] or 0
        losses = row[2] or 0
        total_pnl = row[3] or 0.0
        best = row[4] or 0.0
        worst = row[5] or 0.0

        return {
            "date": date_str,
            "total_trades": total,
            "wins": wins,
            "losses": losses,
            "win_rate": round(wins / total * 100, 1) if total > 0 else 0,
            "total_pnl": round(total_pnl, 2),
            "best_trade": round(best, 2),
            "worst_trade": round(worst, 2)
        }

    except Exception as e:
        print(f"[JOURNAL] Error getting summary: {e}")
        return {"date": date_str, "error": str(e)}


def get_recent_decisions(limit: int = 10) -> list:
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        c.execute("""
            SELECT * FROM decisions ORDER BY id DESC LIMIT ?
        """, (limit,))

        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        return rows

    except Exception as e:
        print(f"[JOURNAL] Error fetching decisions: {e}")
        return []
