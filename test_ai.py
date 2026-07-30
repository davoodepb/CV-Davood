#!/usr/bin/env python3
# ============================================================
#  INSTITUTIONAL HUNTER AI — Teste Direto
#  Corre: python test_ai.py
#  Não precisa de servidor, não precisa de corretora
# ============================================================

import httpx
import json

# ─── COLA A TUA API KEY AQUI ─────────────────────────────────
API_KEY = "COLA_A_TUA_KEY_AQUI"   # sk-ant-...
# ─────────────────────────────────────────────────────────────

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

# ─── CENÁRIOS DE TESTE ────────────────────────────────────────
SCENARIOS = {
    "1": {
        "name": "🟢 London Sweep Low — XAUUSD",
        "data": {
            "symbol": "XAUUSD",
            "event": "liquidity_sweep_low",
            "price": 2341.50,
            "session": "London",
            "htf_bias": "BULLISH",
            "liquidity_level": 2338.0,
            "atr": 1.2,
            "notes": "EQL swept in London killzone, strong rejection wick, closed back inside range"
        }
    },
    "2": {
        "name": "🔴 London Sweep High — XAUUSD",
        "data": {
            "symbol": "XAUUSD",
            "event": "liquidity_sweep_high",
            "price": 2362.80,
            "session": "London",
            "htf_bias": "BEARISH",
            "liquidity_level": 2366.0,
            "atr": 1.2,
            "notes": "EQH swept in London killzone, bearish displacement candle, closed back inside"
        }
    },
    "3": {
        "name": "🟦 NY Session FVG Retest — XAUUSD",
        "data": {
            "symbol": "XAUUSD",
            "event": "fvg_touch",
            "price": 2345.20,
            "session": "NewYork",
            "htf_bias": "BULLISH",
            "liquidity_level": 2340.0,
            "atr": 1.5,
            "notes": "Bullish FVG retest at NY open, momentum building"
        }
    },
    "4": {
        "name": "⚫ Fora de Killzone — Sem Setup",
        "data": {
            "symbol": "XAUUSD",
            "event": "random_move",
            "price": 2350.0,
            "session": "None",
            "htf_bias": "NEUTRAL",
            "liquidity_level": None,
            "atr": 0.8,
            "notes": "Random consolidation at 03:00 UTC, no structure, no session"
        }
    },
    "5": {
        "name": "🟢 NAS100 NY Sweep Low",
        "data": {
            "symbol": "NAS100",
            "event": "liquidity_sweep_low",
            "price": 19250,
            "session": "NewYork",
            "htf_bias": "BULLISH",
            "liquidity_level": 19180,
            "atr": 45,
            "notes": "EQL swept at NY open, strong bullish reaction, BOS forming"
        }
    }
}


def ask_claude(alert_data: dict) -> dict:
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

    response = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        },
        json={
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 600,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": user_message}]
        },
        timeout=30.0
    )
    response.raise_for_status()
    raw = response.json()["content"][0]["text"].strip()
    return json.loads(raw)


def print_decision(decision: dict, scenario_name: str):
    action = decision.get("action", "WAIT")
    conf   = decision.get("confidence", 0)
    entry  = decision.get("entry")
    sl     = decision.get("sl")
    tp     = decision.get("tp")
    rr     = decision.get("rr_ratio")

    colors = {"LONG": "\033[92m", "SHORT": "\033[91m", "WAIT": "\033[93m"}
    reset  = "\033[0m"
    col    = colors.get(action, "")

    print("\n" + "═" * 55)
    print(f"  {scenario_name}")
    print("═" * 55)
    print(f"  DECISÃO  : {col}{action}{reset}")
    print(f"  CONFIANÇA: {'█' * (conf // 10)}{'░' * (10 - conf // 10)} {conf}%")
    print(f"  SETUP    : {decision.get('setup_type', '—')}")
    print(f"  KILLZONE : {decision.get('killzone', '—')}")
    print("─" * 55)
    if action != "WAIT":
        print(f"  ENTRY    : {entry}")
        print(f"  STOP     : {sl}  ← SL além do wick")
        print(f"  TARGET   : {tp}  ← TP na liquidez seguinte")
        print(f"  R:R      : {rr}R")
    print("─" * 55)
    print(f"  RACIOCÍNIO: {decision.get('reasoning', '—')}")
    print(f"  RISCO    : {decision.get('risk_assessment', '—')}")
    print("═" * 55)


def main():
    if API_KEY == "COLA_A_TUA_KEY_AQUI":
        print("\n❌ Esqueceste de colar a tua API key no script!")
        print("   Abre test_ai.py e substitui COLA_A_TUA_KEY_AQUI pela tua key.\n")
        return

    print("\n" + "█" * 55)
    print("  INSTITUTIONAL HUNTER AI — Teste de Cérebro")
    print("  Modelo: claude-sonnet-4-20250514")
    print("  Modo: ANÁLISE APENAS (sem execução)")
    print("█" * 55)

    print("\nEscolhe um cenário para testar:\n")
    for key, s in SCENARIOS.items():
        print(f"  [{key}] {s['name']}")
    print("  [0] Testar TODOS os cenários")
    print("  [q] Sair")

    choice = input("\nEscolha: ").strip().lower()

    if choice == "q":
        return
    elif choice == "0":
        for key, scenario in SCENARIOS.items():
            print(f"\n⏳ A analisar: {scenario['name']}...")
            try:
                decision = ask_claude(scenario["data"])
                print_decision(decision, scenario["name"])
            except Exception as e:
                print(f"\n❌ Erro: {e}")
    elif choice in SCENARIOS:
        scenario = SCENARIOS[choice]
        print(f"\n⏳ A enviar para Claude AI...")
        try:
            decision = ask_claude(scenario["data"])
            print_decision(decision, scenario["name"])

            # Salvar resultado
            with open("last_decision.json", "w") as f:
                json.dump(decision, f, indent=2)
            print("\n✅ Resultado guardado em last_decision.json")
        except httpx.HTTPStatusError as e:
            print(f"\n❌ Erro API ({e.response.status_code}): {e.response.text}")
        except Exception as e:
            print(f"\n❌ Erro: {e}")
    else:
        print("Opção inválida.")


if __name__ == "__main__":
    main()
