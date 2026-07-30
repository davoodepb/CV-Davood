# ============================================================
#  DAVOOD HUNTER AI OS v1.0 — RISK MANAGER
#  Hard Rules enforcer + Kill Switch + Lot Calculator
#  Every rule from Da Vood's TRH Hunter Method
# ============================================================

import math
import json
import os
from datetime import datetime, timezone, timedelta
from config import (
    RISK_PER_TRADE_PCT, MIN_RR_RATIO, MAX_DAILY_LOSS_PCT,
    MAX_OPEN_TRADES, MIN_SCORE, MIN_CONFIDENCE, KILLZONES,
    MAX_DAILY_TRADES, WEEKLY_LOSS_LIMIT_PCT, MONTHLY_LOSS_LIMIT_PCT,
    REVENGE_PAUSE_MINUTES
)
from journal import (
    get_daily_pnl_pct, get_open_trade_count, get_daily_trade_count,
    get_weekly_pnl_pct, get_monthly_pnl_pct, get_last_loss_time,
    get_consecutive_losing_weeks, log_last_loss_time
)

_KILL_SWITCH = False
_KILL_REASON = ""
_MONTHLY_PAUSE_UNTIL = None
_MONTHLY_PAUSE_REASON = ""
_SIZE_REDUCTION = 1.0  # 1.0 = normal, 0.5 = after 2 consecutive losing weeks


def activate_kill_switch(reason: str = "manual"):
    global _KILL_SWITCH, _KILL_REASON
    _KILL_SWITCH = True
    _KILL_REASON = reason
    print(f"[KILL SWITCH] ACTIVATED — {reason}")


def reset_kill_switch():
    global _KILL_SWITCH, _KILL_REASON
    _KILL_SWITCH = False
    _KILL_REASON = ""
    print("[KILL SWITCH] Reset by operator.")


def is_killed() -> bool:
    return _KILL_SWITCH


def is_monthly_paused() -> bool:
    global _MONTHLY_PAUSE_UNTIL
    if _MONTHLY_PAUSE_UNTIL is None:
        return False
    now = datetime.now(timezone.utc)
    if now >= _MONTHLY_PAUSE_UNTIL:
        _MONTHLY_PAUSE_UNTIL = None
        return False
    return True


def get_monthly_pause_remaining() -> str:
    if _MONTHLY_PAUSE_UNTIL is None:
        return "None"
    remaining = _MONTHLY_PAUSE_UNTIL - datetime.now(timezone.utc)
    hours = remaining.total_seconds() / 3600
    return f"{hours:.1f} hours"


def get_position_size_multiplier() -> float:
    return _SIZE_REDUCTION


def in_killzone() -> tuple:
    utc_hour = datetime.now(timezone.utc).hour
    for zone, (start, end) in KILLZONES.items():
        if start <= utc_hour < end:
            return True, zone
    return False, "None"


def check_revenge_pause() -> tuple:
    last_loss = get_last_loss_time()
    if last_loss is None:
        return True, None
    now = datetime.now(timezone.utc)
    try:
        loss_time = datetime.fromisoformat(last_loss).replace(tzinfo=timezone.utc)
    except:
        return True, None
    elapsed = (now - loss_time).total_seconds() / 60
    if elapsed < REVENGE_PAUSE_MINUTES:
        remaining = REVENGE_PAUSE_MINUTES - elapsed
        return False, f"Revenge pause: {remaining:.0f}min remaining (last loss {elapsed:.0f}min ago)"
    return True, None


def approve_trade(decision: dict, account_balance: float) -> tuple:
    """
    Returns (approved: bool, reason: str)
    Enforces ALL Hard Rules from Module 10 of DAVOOD OS
    """

    # Kill switch
    if is_killed():
        return False, f"Kill switch active: {_KILL_REASON}"

    # Monthly pause check
    if is_monthly_paused():
        return False, f"Monthly drawdown pause active: {get_monthly_pause_remaining()} remaining"

    # HARD RULE: action must be directional
    if decision.get("action") == "WAIT":
        return False, "AI decision: WAIT"

    # HARD RULE: AI Score minimum 80
    score = decision.get("score") or 0
    if score < MIN_SCORE:
        return False, f"Score {score}/100 below minimum {MIN_SCORE}"

    # HARD RULE: Kill zone must be active
    if not decision.get("killzone_active"):
        return False, "No active kill zone (London/NY)"

    # HARD RULE: Sweep must be confirmed
    if not decision.get("sweep_confirmed"):
        return False, "Liquidity sweep not confirmed"

    # HARD RULE: Displacement must be confirmed
    if not decision.get("displacement_confirmed"):
        return False, "Displacement candle not confirmed"

    # HARD RULE: Confidence minimum
    conf = decision.get("confidence") or 0
    if conf < MIN_CONFIDENCE:
        return False, f"Confidence {conf}% below minimum {MIN_CONFIDENCE}%"

    # HARD RULE: R:R minimum 2.5
    rr = decision.get("rr_ratio") or 0
    if rr and rr < MIN_RR_RATIO:
        return False, f"R:R {rr:.1f} below minimum {MIN_RR_RATIO}"

    # HARD RULE: News check
    if decision.get("news_check") == "AVOID":
        return False, "High-impact news — avoid trading"

    # HARD RULE: Daily loss limit 3%
    daily_loss = get_daily_pnl_pct(account_balance)
    if daily_loss <= -MAX_DAILY_LOSS_PCT:
        activate_kill_switch(f"Daily loss limit {MAX_DAILY_LOSS_PCT}% hit")
        return False, f"Daily loss limit reached: {daily_loss:.2f}%"

    # HARD RULE: Weekly loss limit 7%
    weekly_loss = get_weekly_pnl_pct(account_balance)
    if weekly_loss <= -WEEKLY_LOSS_LIMIT_PCT:
        activate_kill_switch(f"Weekly loss limit {WEEKLY_LOSS_LIMIT_PCT}% hit")
        return False, f"Weekly loss limit reached: {weekly_loss:.2f}%"

    # HARD RULE: Monthly loss limit 12% → 48-hour pause
    monthly_loss = get_monthly_pnl_pct(account_balance)
    if monthly_loss <= -MONTHLY_LOSS_LIMIT_PCT:
        global _MONTHLY_PAUSE_UNTIL, _MONTHLY_PAUSE_REASON
        _MONTHLY_PAUSE_UNTIL = datetime.now(timezone.utc) + timedelta(hours=48)
        _MONTHLY_PAUSE_REASON = f"Monthly loss limit {MONTHLY_LOSS_LIMIT_PCT}% hit ({monthly_loss:.2f}%)"
        activate_kill_switch(_MONTHLY_PAUSE_REASON)
        return False, _MONTHLY_PAUSE_REASON

    # HARD RULE: Max daily trades (3)
    daily_trades = get_daily_trade_count()
    if daily_trades >= MAX_DAILY_TRADES:
        return False, f"Max daily trades ({MAX_DAILY_TRADES}) reached — today's trades: {daily_trades}"

    # HARD RULE: Max 2 simultaneous trades
    open_trades = get_open_trade_count()
    if open_trades >= MAX_OPEN_TRADES:
        return False, f"Max open trades ({MAX_OPEN_TRADES}) reached"

    # HARD RULE: 30-minute revenge trading pause
    revenge_ok, revenge_reason = check_revenge_pause()
    if not revenge_ok:
        return False, revenge_reason

    # Required fields
    for field in ["entry", "sl", "tp"]:
        if not decision.get(field):
            return False, f"Missing required field: {field}"

    return True, "APPROVED"


def calculate_lot_size(account_balance: float, entry: float,
                       sl: float, symbol: str = "XAUUSD") -> tuple:
    """
    Returns (lot_size, risk_usd)
    Always calculates for exactly RISK_PER_TRADE_PCT% of account
    Applies size reduction if 2 consecutive losing weeks
    """
    base_risk = account_balance * (RISK_PER_TRADE_PCT / 100)
    risk_usd = base_risk * _SIZE_REDUCTION
    sl_distance = abs(entry - sl)

    if sl_distance == 0:
        return 0.01, risk_usd

    symbol_upper = symbol.upper()
    if "XAU" in symbol_upper:
        contract_size = 100
    elif "NAS" in symbol_upper or "US100" in symbol_upper:
        contract_size = 1
    elif "BTC" in symbol_upper:
        contract_size = 1
    else:
        contract_size = 1

    raw_lot = risk_usd / (sl_distance * contract_size)
    lot_size = max(0.01, round(raw_lot, 2))

    return lot_size, round(risk_usd, 2)


def update_weekly_size_reduction():
    """Check consecutive losing weeks and reduce size if needed"""
    global _SIZE_REDUCTION
    losing_weeks = get_consecutive_losing_weeks()
    if losing_weeks >= 2:
        _SIZE_REDUCTION = 0.5
        print(f"[RISK] {losing_weeks} consecutive losing weeks — size reduced to 50%")
    else:
        _SIZE_REDUCTION = 1.0


def get_risk_summary(account_balance: float) -> dict:
    daily_pnl = get_daily_pnl_pct(account_balance)
    weekly_pnl = get_weekly_pnl_pct(account_balance)
    monthly_pnl = get_monthly_pnl_pct(account_balance)
    in_kz, kz_name = in_killzone()
    daily_trades = get_daily_trade_count()
    last_loss = get_last_loss_time()
    losing_weeks = get_consecutive_losing_weeks()

    revenge_ok = True
    revenge_info = None
    if last_loss:
        revenge_ok, revenge_info = check_revenge_pause()

    return {
        "kill_switch_active": is_killed(),
        "kill_reason": _KILL_REASON,
        "monthly_paused": is_monthly_paused(),
        "monthly_pause_remaining": get_monthly_pause_remaining(),
        "size_reduction": f"{int(_SIZE_REDUCTION * 100)}%",
        "consecutive_losing_weeks": losing_weeks,
        "daily_pnl_pct": round(daily_pnl, 2),
        "daily_limit_pct": MAX_DAILY_LOSS_PCT,
        "daily_limit_remaining": round(MAX_DAILY_LOSS_PCT + daily_pnl, 2),
        "weekly_pnl_pct": round(weekly_pnl, 2),
        "weekly_limit_pct": WEEKLY_LOSS_LIMIT_PCT,
        "weekly_limit_remaining": round(WEEKLY_LOSS_LIMIT_PCT + weekly_pnl, 2),
        "monthly_pnl_pct": round(monthly_pnl, 2),
        "monthly_limit_pct": MONTHLY_LOSS_LIMIT_PCT,
        "monthly_limit_remaining": round(MONTHLY_LOSS_LIMIT_PCT + monthly_pnl, 2),
        "daily_trades": daily_trades,
        "max_daily_trades": MAX_DAILY_TRADES,
        "open_trades": get_open_trade_count(),
        "max_open_trades": MAX_OPEN_TRADES,
        "in_killzone": in_kz,
        "current_zone": kz_name,
        "min_score_required": MIN_SCORE,
        "min_rr_required": MIN_RR_RATIO,
        "revenge_pause_active": not revenge_ok,
        "revenge_pause_info": revenge_info,
        "last_loss_time": last_loss,
    }
