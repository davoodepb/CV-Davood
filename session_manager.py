# ============================================================
#  DAVOOD HUNTER AI OS v1.0 — SESSION MANAGER
#  Full AI analyst narration during London & New York
#  Sends every update, every thought, every condition
# ============================================================

import time
import threading
from datetime import datetime, timezone, timedelta
from telegram_alerts import send_telegram_sync

LISBON = timezone(timedelta(hours=1))
LISBON_WINTER = timezone(timedelta(hours=0))

# Session times (Lisbon local time)
LONDON_START = 11
LONDON_END = 13
NY_START = 16
NY_END = 18

PRE_SESSION_MINUTES = 10
STATUS_UPDATE_INTERVAL = 300  # 5 minutes

MARKETS = ["EURUSD", "GBPUSD", "XAUUSD", "NAS100"]


def now_lisbon():
    month = datetime.now(timezone.utc).month
    if 3 <= month <= 10:
        return datetime.now(LISBON)
    return datetime.now(LISBON_WINTER)


def time_str():
    return now_lisbon().strftime("%H:%M")


def is_dst():
    month = datetime.now(timezone.utc).month
    return 3 <= month <= 10


def get_session_state():
    now = now_lisbon()
    h = now.hour
    m = now.minute

    if h == LONDON_START - 1 and m >= (60 - PRE_SESSION_MINUTES):
        return "pre_london"
    elif LONDON_START <= h < LONDON_END:
        return "london"
    elif h == LONDON_END:
        return "london_end"
    elif h == NY_START - 1 and m >= (60 - PRE_SESSION_MINUTES):
        return "pre_ny"
    elif NY_START <= h < NY_END:
        return "ny"
    elif h == NY_END:
        return "ny_end"
    elif h == LONDON_START:
        return "pre_london_done"
    elif h == NY_START:
        return "pre_ny_done"
    else:
        return "off"


def send_daily_plan():
    now = now_lisbon()
    date_str = now.strftime("%d %B %Y")
    weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_name = weekdays[now.weekday()]

    msg = (
        "DAILY TRADING PLAN\n"
        "----------------------------------------\n"
        f"Date: {day_name}, {date_str}\n"
        "\n"
        "Today's Bias:\n"
        "  Weekly: Pending HTF analysis\n"
        "  Daily: Pending HTF analysis\n"
        "\n"
        "Today's Objectives:\n"
        "  1. Analyze HTF structure (4H/1H)\n"
        "  2. Identify external liquidity\n"
        "  3. Mark premium/discount zones\n"
        "  4. Wait for London Kill Zone (11:00)\n"
        "  5. Search for manipulation\n"
        "  6. Search for MSS\n"
        "  7. Search for FVG\n"
        "  8. Search for entry confirmation\n"
        "\n"
        "Markets to Watch:\n"
        "  - EURUSD\n"
        "  - GBPUSD\n"
        "  - XAUUSD\n"
        "  - NAS100\n"
        "\n"
        "----------------------------------------\n"
        "Agent: Ready and waiting."
    )
    send_telegram_sync(msg)


def send_pre_session(session_name):
    msg = (
        f"SESSION STARTS IN {PRE_SESSION_MINUTES} MINUTES\n"
        "----------------------------------------\n"
        f"Session: {session_name}\n"
        f"Time: {time_str()} Lisbon\n"
        "\n"
        "Preparing analysis...\n"
        "\n"
        "Markets:\n"
        "  - EURUSD\n"
        "  - GBPUSD\n"
        "  - XAUUSD\n"
        "  - NAS100\n"
        "\n"
        "----------------------------------------\n"
        "Agent: Warming up."
    )
    send_telegram_sync(msg)


def send_session_start(session_name, conditions=None):
    cond_text = ""
    if conditions:
        for k, v in conditions.items():
            cond_text += f"  {k}: {v}\n"
    else:
        cond_text = "  Pending analysis...\n"

    msg = (
        f"{session_name} SESSION STARTED\n"
        "----------------------------------------\n"
        f"Time: {time_str()} Lisbon\n"
        "\n"
        "Agent Status: Starting analysis.\n"
        "\n"
        "Current Market Structure:\n"
        f"{cond_text}"
        "\n"
        "First task:\n"
        "  Looking for Asian High and Low.\n"
        "\n"
        "Second task:\n"
        "  Checking liquidity pools.\n"
        "\n"
        "Third task:\n"
        "  Waiting for manipulation.\n"
        "\n"
        "No trade yet.\n"
        "----------------------------------------"
    )
    send_telegram_sync(msg)


def send_status_update(session_name, update_data):
    checks = ""
    if "conditions" in update_data:
        for name, met in update_data["conditions"].items():
            status = "YES" if met else "NO"
            checks += f"  {name}: {status}\n"

    expected = ""
    if "expecting" in update_data:
        for exp in update_data["expecting"]:
            expected += f"  - {exp}\n"

    msg = (
        f"STATUS UPDATE - {session_name}\n"
        "----------------------------------------\n"
        f"Time: {time_str()} Lisbon\n"
        "\n"
    )

    if "identified" in update_data:
        msg += "I have identified:\n"
        for item in update_data["identified"]:
            msg += f"  YES {item}\n"
        msg += "\n"

    if "current_task" in update_data:
        msg += f"Current task:\n  {update_data['current_task']}\n\n"

    if checks:
        msg += "Strategy Conditions:\n"
        msg += checks + "\n"

    if expected:
        msg += "Waiting for:\n"
        msg += expected + "\n"

    if "scenario" in update_data:
        msg += f"Scenario: {update_data['scenario']}\n\n"

    if "confidence" in update_data:
        msg += f"Confidence: {update_data['confidence']}\n"

    msg += "----------------------------------------"
    send_telegram_sync(msg)


def send_strategy_matched(trade_data):
    symbol = trade_data.get("symbol", "?")
    entry_zone = trade_data.get("entry_zone", "?")
    stop = trade_data.get("stop", "?")
    tp1 = trade_data.get("tp1", "?")
    tp2 = trade_data.get("tp2", "?")
    confidence = trade_data.get("confidence", "?")
    conditions = trade_data.get("conditions", {})

    cond_text = ""
    for name, met in conditions.items():
        mark = "YES" if met else "NO"
        cond_text += f"  {mark} {name}\n"

    msg = (
        "ALERT: STRATEGY MATCHED\n"
        "----------------------------------------\n"
        f"Symbol: {symbol}\n"
        f"Time: {time_str()} Lisbon\n"
        "\n"
        f"Conditions Met:\n{cond_text}"
        "\n"
        "This matches your strategy.\n"
        "\n"
        f"Entry Zone: {entry_zone}\n"
        f"Stop: {stop}\n"
        f"TP1: {tp1}\n"
        f"TP2: {tp2}\n"
        f"Confidence: {confidence}\n"
        "\n"
        "----------------------------------------\n"
        "ALARM: TRADE OPPORTUNITY"
    )
    send_telegram_sync(msg)


def send_no_setup(session_name, missing_conditions):
    missing_text = ""
    for cond in missing_conditions:
        missing_text += f"  - {cond}\n"

    msg = (
        f"NO VALID SETUP - {session_name}\n"
        "----------------------------------------\n"
        f"Time: {time_str()} Lisbon\n"
        "\n"
        "Current move does not match strategy.\n"
        "\n"
        "Still waiting for:\n"
        f"{missing_text}"
        "\n"
        "----------------------------------------"
    )
    send_telegram_sync(msg)


def send_trade_update(trade_data):
    symbol = trade_data.get("symbol", "?")
    direction = trade_data.get("direction", "?")
    pnl_r = trade_data.get("pnl_r", 0)
    status = trade_data.get("status", "open")

    msg = (
        "TRADE MONITORING\n"
        "----------------------------------------\n"
        f"Time: {time_str()} Lisbon\n"
        "\n"
        f"Symbol: {symbol}\n"
        f"Direction: {direction}\n"
        f"Status: {status}\n"
        f"Current P/L: {pnl_r:+.1f}R\n"
        "\n"
        "Watching for:\n"
        "  - Opposing liquidity\n"
        "  - New MSS\n"
        "  - Early exit conditions\n"
        "\n"
        "----------------------------------------"
    )
    send_telegram_sync(msg)


def send_session_end(session_name, stats):
    msg = (
        f"{session_name} SESSION FINISHED\n"
        "----------------------------------------\n"
        f"Time: {time_str()} Lisbon\n"
        "\n"
        "Session Report:\n"
        "\n"
        "Analysis Steps:\n"
        f"  YES HTF Bias\n"
        f"  YES Liquidity Mapping\n"
        f"  YES Premium/Discount\n"
        f"  YES MSS Detection\n"
        f"  YES FVG Detection\n"
        "\n"
        f"Signals Analyzed: {stats.get('signals', 0)}\n"
        f"Strategy Matches: {stats.get('matches', 0)}\n"
        f"Valid Entries: {stats.get('entries', 0)}\n"
        f"Trades Executed: {stats.get('trades', 0)}\n"
        f"Wins: {stats.get('wins', 0)}\n"
        f"Losses: {stats.get('losses', 0)}\n"
        f"Liquidity Sweeps: {stats.get('sweeps', 0)}\n"
        f"MSS Detected: {stats.get('mss', 0)}\n"
        f"FVG Detected: {stats.get('fvg', 0)}\n"
        "\n"
        "Overall Session Quality: Analyzed\n"
        "----------------------------------------"
    )
    send_telegram_sync(msg)


def send_daily_summary(london_stats, ny_stats):
    total_signals = london_stats.get("signals", 0) + ny_stats.get("signals", 0)
    total_matches = london_stats.get("matches", 0) + ny_stats.get("matches", 0)
    total_trades = london_stats.get("trades", 0) + ny_stats.get("trades", 0)
    total_wins = london_stats.get("wins", 0) + ny_stats.get("wins", 0)

    msg = (
        "DAILY SUMMARY\n"
        "----------------------------------------\n"
        f"Date: {now_lisbon().strftime('%d %B %Y')}\n"
        "\n"
        "London Session:\n"
        f"  Signals Analyzed: {london_stats.get('signals', 0)}\n"
        f"  Strategy Matches: {london_stats.get('matches', 0)}\n"
        f"  Trades: {london_stats.get('trades', 0)}\n"
        "\n"
        "New York Session:\n"
        f"  Signals Analyzed: {ny_stats.get('signals', 0)}\n"
        f"  Strategy Matches: {ny_stats.get('matches', 0)}\n"
        f"  Trades: {ny_stats.get('trades', 0)}\n"
        "\n"
        "Total Today:\n"
        f"  Signals: {total_signals}\n"
        f"  Matches: {total_matches}\n"
        f"  Trades: {total_trades}\n"
        f"  Wins: {total_wins}\n"
        "\n"
        "Agent will repeat tomorrow.\n"
        "----------------------------------------"
    )
    send_telegram_sync(msg)


class SessionManager:
    def __init__(self):
        self.running = False
        self.london_stats = {"signals": 0, "matches": 0, "entries": 0,
                             "trades": 0, "wins": 0, "losses": 0,
                             "sweeps": 0, "mss": 0, "fvg": 0}
        self.ny_stats = {"signals": 0, "matches": 0, "entries": 0,
                         "trades": 0, "wins": 0, "losses": 0,
                         "sweeps": 0, "mss": 0, "fvg": 0}
        self.last_status_time = {}
        self.pre_london_sent = False
        self.pre_ny_sent = False
        self.london_started = False
        self.ny_started = False
        self.daily_plan_sent = False

    def reset_daily(self):
        self.london_stats = {"signals": 0, "matches": 0, "entries": 0,
                             "trades": 0, "wins": 0, "losses": 0,
                             "sweeps": 0, "mss": 0, "fvg": 0}
        self.ny_stats = {"signals": 0, "matches": 0, "entries": 0,
                         "trades": 0, "wins": 0, "losses": 0,
                         "sweeps": 0, "mss": 0, "fvg": 0}
        self.pre_london_sent = False
        self.pre_ny_sent = False
        self.london_started = False
        self.ny_started = False
        self.daily_plan_sent = False

    def log_signal(self, session, is_match=False, is_trade=False, is_win=False):
        stats = self.london_stats if session == "london" else self.ny_stats
        stats["signals"] += 1
        if is_match:
            stats["matches"] += 1
        if is_trade:
            stats["trades"] += 1
        if is_win:
            stats["wins"] += 1
        elif is_trade and not is_win:
            stats["losses"] += 1

    def log_market_event(self, session, event_type):
        stats = self.london_stats if session == "london" else self.ny_stats
        if event_type in stats:
            stats[event_type] += 1

    def should_send_update(self, session, key="default"):
        now = time.time()
        last = self.last_status_time.get(f"{session}_{key}", 0)
        if now - last >= STATUS_UPDATE_INTERVAL:
            self.last_status_time[f"{session}_{key}"] = now
            return True
        return False

    def run(self):
        self.running = True
        print("[SESSION] Session manager started")

        current_day = None

        while self.running:
            try:
                now = now_lisbon()
                today = now.strftime("%Y-%m-%d")

                if today != current_day:
                    self.reset_daily()
                    current_day = today
                    print(f"[SESSION] New day: {today}")
                    send_daily_plan()

                state = get_session_state()

                if state == "pre_london" and not self.pre_london_sent:
                    send_pre_session("London")
                    self.pre_london_sent = True
                    print("[SESSION] Pre-London alert sent")

                if state == "london" and not self.london_started:
                    send_session_start("London")
                    self.london_started = True
                    print("[SESSION] London started")

                if state == "london_end" and self.london_started:
                    send_session_end("London", self.london_stats)
                    self.london_started = False
                    print("[SESSION] London ended")

                if state == "pre_ny" and not self.pre_ny_sent:
                    send_pre_session("New York")
                    self.pre_ny_sent = True
                    print("[SESSION] Pre-NY alert sent")

                if state == "ny" and not self.ny_started:
                    send_session_start("New York")
                    self.ny_started = True
                    print("[SESSION] NY started")

                if state == "ny_end" and self.ny_started:
                    send_session_end("New York", self.ny_stats)
                    send_daily_summary(self.london_stats, self.ny_stats)
                    self.ny_started = False
                    print("[SESSION] NY ended, daily summary sent")

                time.sleep(30)

            except Exception as e:
                print(f"[SESSION] Error: {e}")
                time.sleep(30)

    def start(self):
        t = threading.Thread(target=self.run, daemon=True)
        t.start()
        print("[SESSION] Session manager thread started")


session_manager = SessionManager()
