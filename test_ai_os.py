#!/usr/bin/env python3
"""
DAVOOD HUNTER AI OS v1.0 — TESTER
Uses the complete OS with all 26 modules
"""
import urllib.request, json, sys
sys.path.insert(0, '/home/claude/trading_agent')
from DAVOOD_HUNTER_AI_OS_v1 import DAVOOD_HUNTER_AI_OS

SCENARIOS = {
    "1": {
        "name": "London EQL Sweep → LONG (باید LONG با score بالا بده)",
        "data": {
            "symbol": "XAUUSD", "event": "liquidity_sweep_low",
            "price": 2341.50, "session": "London",
            "htf_bias": "BULLISH", "liquidity_level": 2338.0, "atr": 1.2,
            "swept_low": True, "closed_back_inside": True,
            "displacement_candle": True, "fvg_present": True,
            "bos_confirmed": True, "volume_spike": True,
            "notes": "EQL swept London KZ 08:45, strong bullish displacement, BOS confirmed on 3m"
        }
    },
    "2": {
        "name": "NY EQH Sweep → SHORT (باید SHORT با score بالا بده)",
        "data": {
            "symbol": "XAUUSD", "event": "liquidity_sweep_high",
            "price": 2362.80, "session": "NewYork",
            "htf_bias": "BEARISH", "liquidity_level": 2366.0, "atr": 1.2,
            "swept_high": True, "closed_back_inside": True,
            "displacement_candle": True, "fvg_present": True,
            "bos_confirmed": True, "smt_divergence": True,
            "notes": "EQH swept NY open 13:45, bearish displacement 3 candles, SMT with US30"
        }
    },
    "3": {
        "name": "بدون Displacement → باید WAIT بده",
        "data": {
            "symbol": "XAUUSD", "event": "sweep_low",
            "price": 2350.0, "session": "London",
            "htf_bias": "BULLISH", "liquidity_level": 2347.0, "atr": 0.8,
            "swept_low": True, "closed_back_inside": True,
            "displacement_candle": False, "fvg_present": False,
            "notes": "Sweep low but NO displacement candle — weak rejection"
        }
    },
    "4": {
        "name": "خارج از Killzone → باید WAIT بده",
        "data": {
            "symbol": "NAS100", "event": "sweep_low",
            "price": 19250, "session": "None",
            "htf_bias": "BULLISH", "liquidity_level": 19180, "atr": 45,
            "swept_low": True, "closed_back_inside": True,
            "displacement_candle": True,
            "notes": "03:00 UTC — Asia session, outside all kill zones"
        }
    },
    "5": {
        "name": "همان استاپ قدیمی → باید WAIT بده (درس بزرگ)",
        "data": {
            "symbol": "NAS100", "event": "demand_zone_touch",
            "price": 4145.0, "session": "None",
            "htf_bias": "BULLISH", "liquidity_level": None, "atr": 8,
            "swept_low": False, "closed_back_inside": False,
            "displacement_candle": False, "fvg_present": False,
            "notes": "11:50 UTC-4, price just reached demand zone, NO sweep, NO displacement"
        }
    },
    "6": {
        "name": "🏆 Premium Setup — همه چیز کامل",
        "data": {
            "symbol": "XAUUSD", "event": "liquidity_sweep_low",
            "price": 2341.50, "session": "NewYork",
            "htf_bias": "BULLISH", "liquidity_level": 2338.0, "atr": 1.5,
            "swept_low": True, "closed_back_inside": True,
            "displacement_candle": True, "fvg_present": True,
            "bos_confirmed": True, "smt_divergence": True,
            "volume_spike": True, "order_block": True,
            "notes": "NY open 13:35, Asia low swept, 3 bullish displacement candles, FVG+OB+SMT all aligned, DXY falling"
        }
    }
}

def ask_davood_ai(data, api_key):
    user_msg = f"""
INCOMING MARKET ALERT — Run full DAVOOD HUNTER AI OS analysis:

Symbol: {data.get('symbol')}
Event: {data.get('event')}
Price: {data.get('price')}
Session: {data.get('session')}
HTF Bias: {data.get('htf_bias')}
Liquidity Level: {data.get('liquidity_level')}
ATR: {data.get('atr')}
Swept: Low={data.get('swept_low',False)} | High={data.get('swept_high',False)}
Closed Back Inside: {data.get('closed_back_inside',False)}
Displacement Candle: {data.get('displacement_candle',False)}
FVG Present: {data.get('fvg_present',False)}
BOS Confirmed: {data.get('bos_confirmed',False)}
SMT Divergence: {data.get('smt_divergence',False)}
Volume Spike: {data.get('volume_spike',False)}
Order Block: {data.get('order_block',False)}
Notes: {data.get('notes')}

Run the complete Decision Engine (Module 17).
Calculate Score (Module 18).
Apply all Hard Rules (Module 10).
Think like Da Vood.
Return ONLY valid JSON.
"""
    body = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 800,
        "system": DAVOOD_HUNTER_AI_OS,
        "messages": [{"role": "user", "content": user_msg}]
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=40) as r:
        result = json.loads(r.read())
    raw = result["content"][0]["text"].strip()
    if raw.startswith("```"):
        raw = raw.replace("```json","").replace("```","").strip()
    return json.loads(raw)

def print_result(d, name):
    action = d.get("action","WAIT")
    score = d.get("score", 0)
    bar = "█"*(score//10) + "░"*(10-score//10)
    print(f"\n{'='*60}")
    print(f"  {name}")
    print(f"{'='*60}")
    print(f"  SIGNAL  : *** {action} ***")
    print(f"  SCORE   : [{bar}] {score}/100")
    print(f"  CONF    : {d.get('confidence',0)}%")
    print(f"  KILLZONE: {d.get('killzone_active')} — {d.get('session','?')}")
    print(f"  SWEEP   : {d.get('sweep_confirmed')} | DISP: {d.get('displacement_confirmed')}")
    print(f"  HTF BIAS: {d.get('htf_bias','?')}")
    print(f"  NEWS    : {d.get('news_check','?')}")
    print(f"-"*60)
    if action in ("LONG","SHORT"):
        print(f"  ENTRY   : {d.get('entry')}")
        print(f"  SL      : {d.get('sl')}")
        print(f"  TP      : {d.get('tp')}")
        print(f"  R:R     : {d.get('rr_ratio')}R")
        print(f"  SOFT    : {d.get('soft_rules_present',[])}") 
    if d.get('reject_reasons'):
        print(f"  REJECTS : {d.get('reject_reasons')}")
    print(f"-"*60)
    print(f"  REASON  : {d.get('reasoning','')}")
    print(f"  SIMILAR : {d.get('similar_trade','?')}")
    print(f"  RISK    : {d.get('risk_assessment','?')}")
    print(f"{'='*60}")
    with open("last_os_decision.json","w") as f:
        json.dump(d, f, indent=2, ensure_ascii=False)

def main():
    print("\n" + "█"*60)
    print("  DAVOOD HUNTER AI OS v1.0 — Full Brain Tester")
    print("  26 Modules | Decision Engine | Scoring System")
    print("█"*60)
    api_key = input("\n  Claude API Key: ").strip()
    if not api_key.startswith("sk-ant"):
        print("  Invalid key."); return
    print("\n  Scenarios:\n")
    for k,s in SCENARIOS.items():
        print(f"    [{k}] {s['name']}")
    print("    [0] All scenarios")
    print("    [q] Exit\n")
    choice = input("  Choose: ").strip().lower()
    if choice == "q": return
    targets = list(SCENARIOS.items()) if choice == "0" else [(choice, SCENARIOS[choice])] if choice in SCENARIOS else []
    for k,s in targets:
        print(f"\n  Sending to DAVOOD HUNTER AI OS...")
        try:
            result = ask_davood_ai(s["data"], api_key)
            print_result(result, s["name"])
        except Exception as e:
            print(f"  Error: {e}")
        if choice == "0":
            input("\n  Enter for next...")
    input("\n  Press Enter to exit.")

if __name__ == "__main__":
    main()
