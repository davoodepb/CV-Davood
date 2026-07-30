#!/usr/bin/env python3
# ============================================================
#  TRH HUNTER METHOD — Rule-Based Bot
#  بدون API، بدون اینترنت، فقط Python خالص
#  استراتژی: TRH Liquidity Trap System
#  کور: python trh_bot.py
# ============================================================

import json
import sqlite3
from datetime import datetime, timezone

# ─── تنظیمات ─────────────────────────────────────────────────
RISK_PER_TRADE   = 1.0    # % ریسک هر ترید
MIN_RR           = 2.5    # حداقل R:R
MIN_SCORE        = 5      # حداقل امتیاز confluence از 8
DB_FILE          = "trh_journal.db"

# Killzone لیسبون (UTC)
KILLZONES = {
    "London":  (7, 10),    # 08:00-11:00 لیسبون
    "NewYork": (12, 15),   # 13:30-16:00 لیسبون
}

# ─── DATABASE ────────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_FILE)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS signals (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            time      TEXT,
            symbol    TEXT,
            action    TEXT,
            score     INTEGER,
            entry     REAL,
            sl        REAL,
            tp        REAL,
            rr        REAL,
            reason    TEXT
        )
    """)
    conn.commit()
    conn.close()

def save_signal(data: dict):
    conn = sqlite3.connect(DB_FILE)
    conn.execute("""
        INSERT INTO signals (time,symbol,action,score,entry,sl,tp,rr,reason)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        datetime.now().isoformat(),
        data["symbol"], data["action"], data["score"],
        data.get("entry"), data.get("sl"), data.get("tp"),
        data.get("rr"), data.get("reason")
    ))
    conn.commit()
    conn.close()

# ─── KILLZONE CHECK ──────────────────────────────────────────
def check_killzone() -> tuple:
    utc_hour = datetime.now(timezone.utc).hour
    for zone, (start, end) in KILLZONES.items():
        if start <= utc_hour < end:
            return True, zone
    return False, "None"

# ─── ENGINE اصلی ─────────────────────────────────────────────
def analyze(data: dict) -> dict:
    """
    TRH Hunter Method — Rule Engine
    ورودی: داده‌های بازار
    خروجی: تصمیم LONG / SHORT / WAIT
    """
    score  = 0
    notes  = []
    action = "WAIT"

    symbol     = data.get("symbol", "XAUUSD")
    price      = float(data.get("price", 0))
    event      = data.get("event", "")
    htf_bias   = data.get("htf_bias", "NEUTRAL").upper()
    eq_high    = data.get("equal_high")
    eq_low     = data.get("equal_low")
    swept_high = data.get("swept_high", False)
    swept_low  = data.get("swept_low", False)
    closed_back= data.get("closed_back_inside", False)
    displacement = data.get("displacement_candle", False)
    fvg        = data.get("fvg_present", False)
    bos        = data.get("bos_confirmed", False)
    atr        = float(data.get("atr", 1.0))

    # ── قانون 1: Killzone ────────────────────────────────────
    in_kz, kz_name = check_killzone()
    if in_kz:
        score += 2
        notes.append(f"✅ {kz_name} Killzone فعاله")
    else:
        notes.append("❌ خارج از Killzone — probability پایین")

    # ── قانون 2: Equal Highs/Lows ────────────────────────────
    if eq_low and swept_low:
        score += 2
        notes.append("✅ Equal Lows شناسایی و Swept شد")
        action = "LONG"
    elif eq_high and swept_high:
        score += 2
        notes.append("✅ Equal Highs شناسایی و Swept شد")
        action = "SHORT"
    else:
        notes.append("❌ Liquidity Sweep تأیید نشد")

    # ── قانون 3: Closed Back Inside ──────────────────────────
    if closed_back:
        score += 1
        notes.append("✅ Price بسته شد داخل Range")
    else:
        notes.append("❌ Close Back Inside نداریم")

    # ── قانون 4: Displacement Candle ─────────────────────────
    if displacement:
        score += 2
        notes.append("✅ Displacement Candle تأیید شد")
    else:
        notes.append("❌ Displacement Candle نداریم")
        action = "WAIT"  # بدون displacement = WAIT

    # ── قانون 5: HTF Bias ────────────────────────────────────
    if (action == "LONG"  and htf_bias == "BULLISH") or \
       (action == "SHORT" and htf_bias == "BEARISH"):
        score += 1
        notes.append(f"✅ HTF Bias هماهنگه: {htf_bias}")
    elif htf_bias == "NEUTRAL":
        notes.append("⚠️ HTF Bias خنثیه")
    else:
        score -= 1
        notes.append(f"❌ HTF Bias مخالفه: {htf_bias}")
        action = "WAIT"

    # ── قانون 6: FVG / BOS ───────────────────────────────────
    if fvg:
        score += 1
        notes.append("✅ FVG حضور داره")
    if bos:
        score += 1
        notes.append("✅ BOS تأیید شد")

    # ── محاسبه Entry / SL / TP ───────────────────────────────
    entry = sl = tp = rr = None

    if action in ("LONG", "SHORT") and score >= MIN_SCORE:
        sl_distance = atr * 1.5

        if action == "LONG":
            entry = price
            sl    = round(price - sl_distance, 2)
            tp    = round(price + (sl_distance * MIN_RR * 1.5), 2)
        else:
            entry = price
            sl    = round(price + sl_distance, 2)
            tp    = round(price - (sl_distance * MIN_RR * 1.5), 2)

        rr = round(abs(tp - entry) / abs(sl - entry), 1)

        if rr < MIN_RR:
            action = "WAIT"
            notes.append(f"❌ RR {rr} پایین‌تر از حداقل {MIN_RR}")
        else:
            notes.append(f"✅ RR: {rr}R — تأیید شد")
    elif action != "WAIT":
        action = "WAIT"
        notes.append(f"❌ Score {score}/8 — حداقل {MIN_SCORE} لازمه")

    return {
        "action":  action,
        "symbol":  symbol,
        "score":   score,
        "max_score": 8,
        "killzone": kz_name,
        "entry":   entry,
        "sl":      sl,
        "tp":      tp,
        "rr":      rr,
        "htf_bias": htf_bias,
        "reason":  " | ".join(notes)
    }

# ─── PRINT نتیجه ─────────────────────────────────────────────
def print_result(r: dict, name: str):
    action = r["action"]
    score  = r["score"]
    total  = r["max_score"]

    bar = "█" * score + "░" * (total - score)

    print("\n" + "=" * 60)
    print(f"  {name}")
    print("=" * 60)
    print(f"  SIGNAL   : *** {action} ***")
    print(f"  SCORE    : [{bar}] {score}/{total}")
    print(f"  KILLZONE : {r['killzone']}")
    print(f"  HTF BIAS : {r['htf_bias']}")
    print("-" * 60)

    if action in ("LONG", "SHORT"):
        print(f"  ENTRY    : {r['entry']}")
        print(f"  STOP     : {r['sl']}")
        print(f"  TARGET   : {r['tp']}")
        print(f"  R:R      : {r['rr']}R")
    else:
        print("  WAIT — شرایط کافی نیست")

    print("-" * 60)
    for note in r["reason"].split(" | "):
        print(f"  {note}")
    print("=" * 60)

# ─── سناریوهای تست ───────────────────────────────────────────
SCENARIOS = {
    "1": {
        "name": "🟢 XAUUSD — London Sweep Low (باید LONG بده)",
        "data": {
            "symbol": "XAUUSD", "price": 2341.50,
            "event": "sweep_low", "htf_bias": "BULLISH",
            "equal_low": 2338.0, "equal_high": None,
            "swept_low": True, "swept_high": False,
            "closed_back_inside": True,
            "displacement_candle": True,
            "fvg_present": True, "bos_confirmed": False,
            "atr": 1.2
        }
    },
    "2": {
        "name": "🔴 XAUUSD — London Sweep High (باید SHORT بده)",
        "data": {
            "symbol": "XAUUSD", "price": 2362.80,
            "event": "sweep_high", "htf_bias": "BEARISH",
            "equal_low": None, "equal_high": 2366.0,
            "swept_low": False, "swept_high": True,
            "closed_back_inside": True,
            "displacement_candle": True,
            "fvg_present": True, "bos_confirmed": True,
            "atr": 1.2
        }
    },
    "3": {
        "name": "⚫ XAUUSD — بدون Displacement (باید WAIT بده)",
        "data": {
            "symbol": "XAUUSD", "price": 2350.0,
            "event": "sweep_low", "htf_bias": "BULLISH",
            "equal_low": 2347.0, "equal_high": None,
            "swept_low": True, "swept_high": False,
            "closed_back_inside": True,
            "displacement_candle": False,  # ← بدون displacement
            "fvg_present": False, "bos_confirmed": False,
            "atr": 0.8
        }
    },
    "4": {
        "name": "⚫ NAS100 — خارج از Killzone (باید WAIT بده)",
        "data": {
            "symbol": "NAS100", "price": 19250,
            "event": "sweep_low", "htf_bias": "BULLISH",
            "equal_low": 19180, "equal_high": None,
            "swept_low": True, "swept_high": False,
            "closed_back_inside": True,
            "displacement_candle": True,
            "fvg_present": True, "bos_confirmed": True,
            "atr": 45
            # ساعت فعلی خارج از killzone شبیه‌سازی می‌شه
        }
    },
    "5": {
        "name": "🟢 همان استاپ تو — ببین چی می‌گه",
        "data": {
            "symbol": "NAS100", "price": 4145.0,
            "event": "demand_zone", "htf_bias": "BULLISH",
            "equal_low": None, "equal_high": None,
            "swept_low": False, "swept_high": False,  # ← sweep نداشت
            "closed_back_inside": False,
            "displacement_candle": False,  # ← displacement نداشت
            "fvg_present": False, "bos_confirmed": False,
            "atr": 8
        }
    }
}

# ─── MAIN ────────────────────────────────────────────────────
def main():
    init_db()

    print()
    print("█" * 60)
    print("  TRH HUNTER METHOD — Rule-Based Signal Engine")
    print("  بدون API | استراتژی: TRH Liquidity Trap System")
    print("█" * 60)

    utc_now = datetime.now(timezone.utc)
    in_kz, kz = check_killzone()
    print(f"\n  ساعت UTC: {utc_now.strftime('%H:%M')}")
    print(f"  Killzone: {'🟢 ' + kz + ' فعاله' if in_kz else '⚫ خارج از Killzone'}")

    print("\n  سناریو انتخاب کن:\n")
    for k, s in SCENARIOS.items():
        print(f"    [{k}] {s['name']}")
    print("    [0] همه سناریوها")
    print("    [q] خروج")

    choice = input("\n  انتخاب: ").strip().lower()

    if choice == "q":
        return
    elif choice == "0":
        for k, s in SCENARIOS.items():
            result = analyze(s["data"])
            print_result(result, s["name"])
            save_signal(result)
            input("\n  Enter برای بعدی...")
    elif choice in SCENARIOS:
        s = SCENARIOS[choice]
        result = analyze(s["data"])
        print_result(result, s["name"])
        save_signal(result)
        print(f"\n  ✅ نتیجه در {DB_FILE} ذخیره شد")
    else:
        print("  انتخاب نامعتبر")

    input("\n  Enter برای خروج...")

if __name__ == "__main__":
    main()
