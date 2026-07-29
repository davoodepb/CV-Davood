# ============================================================
#  DAVOOD HUNTER AI OS v1.0 — RISK MANAGER
#  Hard Rules enforcement — Kill Switch — Daily Limits
# ============================================================

from datetime import datetime, timezone, timedelta
from config import (
    RISK_PER_TRADE, DAILY_LOSS_LIMIT, WEEKLY_LOSS_LIMIT,
    MONTHLY_LOSS_LIMIT, MAX_DAILY_TRADES, MAX_OPEN_TRADES,
    MIN_RR_RATIO, LONDON_START, LONDON_END, NY_START, NY_END
)

# ─── STATE ───────────────────────────────────────────────────
_kill_switch = False
_kill_reason = ""
_daily_pnl = 0.0
_daily_trades = 0
_open_trades = 0
_last_loss_time = None
_weekly_pnl = 0.0
_monthly_pnl = 0.0
_today = None


def _reset_daily_if_needed():
    global _today, _daily_pnl, _daily_trades
    today = datetime.now(timezone.utc).date()
    if _today != today:
        _daily_pnl = 0.0
        _daily_trades = 0
        _today = today


def activate_kill_switch(reason: str = "Manual activation"):
    global _kill_switch, _kill_reason
    _kill_switch = True
    _kill_reason = f"{reason} — {datetime.now(timezone.utc).isoformat()}"
    print(f"[RISK] KILL SWITCH ACTIVATED: {_kill_reason}")


def reset_kill_switch():
    global _kill_switch, _kill_reason
    _kill_switch = False
    _kill_reason = ""
    print("[RISK] Kill switch reset")


def is_killed() -> bool:
    _reset_daily_if_needed()
    return _kill_switch


def in_killzone() -> tuple:
    now = datetime.now(timezone.utc)
    lisbon_offset = timedelta(hours=1)
    lisbon_time = now + lisbon_offset
    hour = lisbon_time.hour

    if LONDON_START <= hour < LONDON_END:
        return True, "London"
    elif NY_START <= hour < NY_END:
        return True, "NewYork"
    else:
        return False, "None"


def _check_killzone() -> bool:
    in_kz, _ = in_killzone()
    return in_kz


def _check_sweep(decision: dict) -> bool:
    return decision.get("sweep_confirmed", False)


def _check_displacement(decision: dict) -> bool:
    return decision.get("displacement_confirmed", False)


def _check_rr(decision: dict) -> bool:
    rr = decision.get("rr_ratio")
    if rr is None:
        return False
    try:
        return float(rr) >= MIN_RR_RATIO
    except (TypeError, ValueError):
        return False


def _check_daily_loss_limit() -> bool:
    _reset_daily_if_needed()
    return abs(_daily_pnl) < DAILY_LOSS_LIMIT


def _check_revenge_trade() -> bool:
    if _last_loss_time is None:
        return True
    elapsed = (datetime.now(timezone.utc) - _last_loss_time).total_seconds()
    return elapsed >= 1800


def _check_daily_trade_limit() -> bool:
    _reset_daily_if_needed()
    return _daily_trades < MAX_DAILY_TRADES


def _check_open_trades() -> bool:
    return _open_trades < MAX_OPEN_TRADES


def approve_trade(decision: dict, balance: float = 10000.0) -> tuple:
    _reset_daily_if_needed()

    action = decision.get("action", "WAIT")
    if action == "WAIT":
        return False, "AI returned WAIT"

    if _kill_switch:
        return False, f"Kill switch active: {_kill_reason}"

    if not _check_killzone():
        return False, "Outside kill zone (Hard Rule 1)"

    if not _check_sweep(decision):
        return False, "No sweep confirmed (Hard Rule 2)"

    if not _check_displacement(decision):
        return False, "No displacement confirmed (Hard Rule 3)"

    if not _check_rr(decision):
        return False, f"R:R below {MIN_RR_RATIO} (Hard Rule 6)"

    if not _check_daily_loss_limit():
        activate_kill_switch(f"Daily loss limit {DAILY_LOSS_LIMIT*100}% hit")
        return False, f"Daily loss limit hit (Hard Rule 10)"

    if not _check_revenge_trade():
        return False, "Revenge trading pause — 30 min cooldown (Hard Rule 7)"

    if not _check_daily_trade_limit():
        return False, f"Max {MAX_DAILY_TRADES} daily trades reached"

    if not _check_open_trades():
        return False, f"Max {MAX_OPEN_TRADES} open trades reached (Hard Rule 8)"

    score = decision.get("score", 0) or 0
    if score < 80:
        return False, f"Score {score}/100 below minimum 80"

    return True, "APPROVED"


def record_trade_result(pnl: float):
    global _daily_pnl, _daily_trades, _last_loss_time, _weekly_pnl, _monthly_pnl
    _reset_daily_if_needed()
    _daily_pnl += pnl
    _weekly_pnl += pnl
    _monthly_pnl += pnl
    _daily_trades += 1

    if pnl < 0:
        _last_loss_time = datetime.now(timezone.utc)

    if abs(_daily_pnl) >= DAILY_LOSS_LIMIT:
        activate_kill_switch(f"Daily loss limit {DAILY_LOSS_LIMIT*100}% hit")

    if abs(_weekly_pnl) >= WEEKLY_LOSS_LIMIT:
        print(f"[RISK] WARNING: Weekly loss limit {WEEKLY_LOSS_LIMIT*100}% hit")


def record_position_opened():
    global _open_trades
    _open_trades += 1


def record_position_closed():
    global _open_trades
    _open_trades = max(0, _open_trades - 1)


def get_risk_summary(balance: float = 10000.0) -> dict:
    _reset_daily_if_needed()
    in_kz, kz = in_killzone()
    return {
        "kill_switch": _kill_switch,
        "kill_reason": _kill_reason,
        "in_killzone": in_kz,
        "killzone": kz,
        "daily_pnl_pct": round(_daily_pnl * 100, 2),
        "daily_trades": _daily_trades,
        "max_daily_trades": MAX_DAILY_TRADES,
        "open_trades": _open_trades,
        "max_open_trades": MAX_OPEN_TRADES,
        "daily_loss_limit_pct": DAILY_LOSS_LIMIT * 100,
        "risk_per_trade_pct": RISK_PER_TRADE * 100,
        "min_rr": MIN_RR_RATIO,
        "weekly_pnl_pct": round(_weekly_pnl * 100, 2),
        "monthly_pnl_pct": round(_monthly_pnl * 100, 2),
        "balance": balance
    }
