#!/usr/bin/env python3
# ============================================================
#  INSTITUTIONAL HUNTER AI — Teste (sem pip necessario)
#  Usa so bibliotecas built-in do Python
#  Corre: python test_ai.py
# ============================================================

import urllib.request
import urllib.error
import json

SYSTEM_PROMPT = """You are an Institutional Trading Intelligence System — the Institutional Hunter AI.

Your role: think exactly like an elite SMC (Smart Money Concepts) trader.
Same mindset. Same patience. Same execution. Same trap-hunting behavior.

CORE BELIEF: The market is engineered. Most moves trap retail, collect liquidity, trigger stops.
The real move starts AFTER fake breakouts, stop hunts, panic entries.
You do NOT chase price. You wait for prey to enter the trap.

ENTRY MODEL:
LONG: equal lows swept → strong rejection → closes back inside → bullish displacement → enter
SHORT: equal highs swept → strong rejection → closes back inside → bearish displacement → enter

KILLZONES (Lisbon time):
London: 08:00-11:00 (HIGH priority)
New York: 13:30-16:00 (HIGH priority)
Outside killzones: WAIT unless perfect setup

RISK: Min RR 1:2.5, preferred 1:5+. SL beyond sweep wick. No setup = WAIT.

RESPOND ONLY WITH VALID JSON. No other text:
{
  "action": "LONG" or "SHORT" or "WAIT",
  "confidence": 0-100,
  "entry": float or null,
  "sl": float or null,
  "tp": float or null,
  "rr_ratio": float or null,
  "killzone": "London" or "NewYork" or "None",
  "setup_type": "liquidity_sweep" or "fvg_retest" or "break_of_structure" or "no_setup",
  "reasoning": "max 80 words",
  "risk_assessment": "LOW" or "MEDIUM" or "HIGH"
}"""

SCENARIOS = {
    "1": {
        "name": "LONG SETUP — London Sweep Low XAUUSD",
        "data": {
            "symbol": "XAUUSD",
            "event": "liquidity_sweep_low",
            "price": 2341.50,
            "session": "London",
            "htf_bias": "BULLISH",
            "liquidity_level": 2338.0,
            "atr": 1.2,
            "notes": "EQL swept in London killzone, strong rejection wick, closed back inside range, bullish displacement forming"
        }
    },
    "2": {
        "name": "SHORT SETUP — London Sweep High XAUUSD",
        "data": {
            "symbol": "XAUUSD",
            "event": "liquidity_sweep_high",
            "price": 2362.80,
            "session": "London",
            "htf_bias": "BEARISH",
            "liquidity_level": 2366.0,
            "atr": 1.2,
            "notes": "EQH swept in London killzone, bearish displacement candle, closed back inside range"
        }
    },
    "3": {
        "name": "LONG SETUP — NY FVG Retest XAUUSD",
        "data": {
            "symbol": "XAUUSD",
            "event": "fvg_touch",
            "price": 2345.20,
            "session": "NewYork",
            "htf_bias": "BULLISH",
            "liquidity_level": 2340.0,
            "atr": 1.5,
            "notes": "Bullish FVG retest at NY open, momentum building, prior sweep confirmed"
        }
    },
    "4": {
        "name": "SEM SETUP — Fora de Killzone (deve dizer WAIT)",
        "data": {
            "symbol": "XAUUSD",
            "event": "random_move",
            "price": 2350.0,
            "session": "None",
            "htf_bias": "NEUTRAL",
            "liquidity_level": None,
            "atr": 0.8,
            "notes": "Random consolidation at 03:00 UTC, no structure, no session, no confirmation"
        }
    },
    "5": {
        "name": "LONG SETUP — NAS100 NY Sweep Low",
        "data": {
            "symbol": "NAS100",
            "event": "liquidity_sweep_low",
            "price": 19250,
            "session": "NewYork",
            "htf_bias": "BULLISH",
            "liquidity_level": 19180,
            "atr": 45,
            "notes": "EQL swept at NY open, strong bullish reaction, BOS forming on 5m"
        }
    }
}


def ask_claude(alert_data: dict, api_key: str) -> dict:
    user_message = f"""INCOMING MARKET ALERT — Analyze and decide:

Symbol: {alert_data.get('symbol')}
Event: {alert_data.get('event')}
Current Price: {alert_data.get('price')}
Session: {alert_data.get('session')}
HTF Bias: {alert_data.get('htf_bias')}
Nearest Liquidity Level: {alert_data.get('liquidity_level', 'N/A')}
ATR: {alert_data.get('atr')}
Notes: {alert_data.get('notes')}

Apply your full institutional analysis. Return ONLY the JSON decision."""

    body = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 600,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_message}]
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        },
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read().decode("utf-8"))

    raw = result["content"][0]["text"].strip()
    if raw.startswith("```"):
        raw = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(raw)


def print_decision(decision: dict, scenario_name: str):
    action = decision.get("action", "WAIT")
    conf   = decision.get("confidence", 0)

    bar_filled = "█" * (conf // 10)
    bar_empty  = "░" * (10 - conf // 10)

    print("\n" + "=" * 58)
    print(f"  {scenario_name}")
    print("=" * 58)
    print(f"  DECISAO   : *** {action} ***")
    print(f"  CONFIANCA : [{bar_filled}{bar_empty}] {conf}%")
    print(f"  SETUP     : {decision.get('setup_type', 'N/A')}")
    print(f"  KILLZONE  : {decision.get('killzone', 'N/A')}")
    print("-" * 58)

    if action in ("LONG", "SHORT"):
        print(f"  ENTRY     : {decision.get('entry')}")
        print(f"  STOP LOSS : {decision.get('sl')}  <- alem do wick")
        print(f"  TAKE PROF : {decision.get('tp')}  <- proxima liquidez")
        print(f"  RISK/REWD : {decision.get('rr_ratio')}R")
    else:
        print("  Sem niveis de entrada — AI diz para ESPERAR")

    print("-" * 58)
    print(f"  RACIOCINIO: {decision.get('reasoning', 'N/A')}")
    print(f"  RISCO     : {decision.get('risk_assessment', 'N/A')}")
    print("=" * 58)

    with open("last_decision.json", "w") as f:
        json.dump(decision, f, indent=2, ensure_ascii=False)
    print("  [Guardado em last_decision.json]")


def main():
    print()
    print("=" * 58)
    print("  INSTITUTIONAL HUNTER AI — Teste do Cerebro")
    print("  Zero dependencias externas")
    print("=" * 58)

    # Pede a API key em vez de estar hardcoded
    print()
    api_key = input("  Cola a tua Claude API Key aqui: ").strip()

    if not api_key or not api_key.startswith("sk-ant"):
        print("\n  ERRO: Key invalida. Deve comecar com sk-ant...")
        input("\n  Carrega Enter para sair.")
        return

    print()
    print("  Escolhe o cenario:\n")
    for k, s in SCENARIOS.items():
        print(f"    [{k}] {s['name']}")
    print("    [0] Testar TODOS os cenarios")
    print("    [q] Sair")

    print()
    choice = input("  Escolha: ").strip().lower()

    if choice == "q":
        return

    elif choice == "0":
        for k, scenario in SCENARIOS.items():
            print(f"\n  A analisar: {scenario['name']} ...")
            try:
                decision = ask_claude(scenario["data"], api_key)
                print_decision(decision, scenario["name"])
                input("\n  Carrega Enter para o proximo cenario...")
            except Exception as e:
                print(f"\n  ERRO: {e}")

    elif choice in SCENARIOS:
        scenario = SCENARIOS[choice]
        print(f"\n  A enviar para Claude AI... aguarda 5 segundos...")
        try:
            decision = ask_claude(scenario["data"], api_key)
            print_decision(decision, scenario["name"])
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            print(f"\n  ERRO HTTP {e.code}: {body}")
        except Exception as e:
            print(f"\n  ERRO: {e}")
    else:
        print("  Opcao invalida.")

    print()
    input("  Carrega Enter para sair.")


if __name__ == "__main__":
    main()
