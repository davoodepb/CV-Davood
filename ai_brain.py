# ============================================================
#  DAVOOD HUNTER AI OS v1.0 — AI BRAIN
#  Multi-API: OpenRouter (primary) + fallbacks
#  Uses complete 26-module OS as system prompt
# ============================================================

import urllib.request
import json
import os
from dotenv import load_dotenv
from DAVOOD_HUNTER_AI_OS_v1 import DAVOOD_HUNTER_AI_OS

load_dotenv()

# ─── API CONFIGURATION ───────────────────────────────────────
# Priority: NVIDIA → OpenRouter → Claude → OpenAI → DeepSeek → Groq
APIS = [
    {
        "name": "NVIDIA (Llama 3.1 70B)",
        "url": "https://integrate.api.nvidia.com/v1/chat/completions",
        "key_env": "NVIDIA_API_KEY",
        "model": "meta/llama-3.1-70b-instruct",
        "format": "openai"
    },
    {
        "name": "OpenRouter (Claude)",
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "key_env": "OPENROUTER_API_KEY",
        "model": "anthropic/claude-sonnet-4",
        "format": "openai"
    },
    {
        "name": "OpenRouter (GPT-4o)",
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "key_env": "OPENROUTER_API_KEY",
        "model": "openai/gpt-4o",
        "format": "openai"
    },
    {
        "name": "Claude Direct",
        "url": "https://api.anthropic.com/v1/messages",
        "key_env": "CLAUDE_API_KEY",
        "model": "claude-sonnet-4-20250514",
        "format": "anthropic"
    },
    {
        "name": "OpenAI Direct",
        "url": "https://api.openai.com/v1/chat/completions",
        "key_env": "OPENAI_API_KEY",
        "model": "gpt-4o",
        "format": "openai"
    },
    {
        "name": "DeepSeek",
        "url": "https://api.deepseek.com/v1/chat/completions",
        "key_env": "DEEPSEEK_API_KEY",
        "model": "deepseek-chat",
        "format": "openai"
    },
    {
        "name": "Groq",
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "key_env": "GROQ_API_KEY",
        "model": "llama-3.3-70b-versatile",
        "format": "openai"
    },
]


def build_user_message(alert_data: dict) -> str:
    return f"""
INCOMING MARKET ALERT — Run full DAVOOD HUNTER AI OS analysis:

Symbol: {alert_data.get('symbol', 'XAUUSD')}
Event: {alert_data.get('event', 'unknown')}
LIVE Price from TradingView: {alert_data.get('price', 'N/A')}
Session: {alert_data.get('session', 'N/A')}
HTF Bias: {alert_data.get('htf_bias', 'NEUTRAL')}
Liquidity Level: {alert_data.get('liquidity_level', 'N/A')}
ATR: {alert_data.get('atr', 'N/A')}
Swept Low: {alert_data.get('swept_low', False)}
Swept High: {alert_data.get('swept_high', False)}
Closed Back Inside: {alert_data.get('closed_back_inside', False)}
Displacement Candle: {alert_data.get('displacement_candle', False)}
FVG Present: {alert_data.get('fvg_present', False)}
BOS Confirmed: {alert_data.get('bos_confirmed', False)}
SMT Divergence: {alert_data.get('smt_divergence', False)}
Volume Spike: {alert_data.get('volume_spike', False)}
DXY Direction: {alert_data.get('dxy', 'N/A')}
Notes: {alert_data.get('notes', 'none')}

CRITICAL RULE — NEVER GENERATE PRICES:
- The price above is the LIVE market price from TradingView.
- You MUST use this exact price for Entry, SL, and TP calculations.
- NEVER fabricate, estimate, or guess prices.
- Entry must be near the live price (within ATR distance).
- If the live price is not provided, respond with WAIT.
- Entry, SL, TP must all be derived from the live price + liquidity levels.

Run the complete Decision Engine (Module 17).
Calculate Score (Module 18).
Apply all Hard Rules (Module 10).
Think EXACTLY like Da Vood.
Return ONLY valid JSON — no other text — no markdown.

Required JSON:
{{
  "action": "LONG" or "SHORT" or "WAIT",
  "score": 0-100,
  "confidence": 0-100,
  "entry": float or null,
  "sl": float or null,
  "tp": float or null,
  "rr_ratio": float or null,
  "session": "London" or "NewYork" or "None",
  "killzone_active": true or false,
  "sweep_confirmed": true or false,
  "displacement_confirmed": true or false,
  "htf_bias": "BULLISH" or "BEARISH" or "NEUTRAL",
  "liquidity_level_swept": float or null,
  "soft_rules_present": [],
  "reject_reasons": [],
  "reasoning": "max 100 words thinking like Da Vood",
  "similar_trade": "which Da Vood trade this resembles",
  "risk_assessment": "LOW" or "MEDIUM" or "HIGH",
  "news_check": "CLEAR" or "CAUTION" or "AVOID"
}}
"""


def _call_openai_format(api: dict, user_message: str) -> dict:
    key = os.getenv(api["key_env"], "")
    if not key:
        raise ValueError(f"No key for {api['name']}")

    payload = {
        "model": api["model"],
        "max_tokens": 1000,
        "messages": [
            {"role": "system", "content": DAVOOD_HUNTER_AI_OS},
            {"role": "user", "content": user_message}
        ],
        "temperature": 0.1,
        "response_format": {"type": "json_object"}
    }

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if "openrouter" in api["url"]:
        headers["HTTP-Referer"] = "https://tradingroomhunter.com"
        headers["X-Title"] = "DAVOOD HUNTER AI OS"

    body = json.dumps(payload).encode()
    req = urllib.request.Request(api["url"], data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=40) as r:
        result = json.loads(r.read())

    return json.loads(result["choices"][0]["message"]["content"])


def _call_anthropic_format(api: dict, user_message: str) -> dict:
    key = os.getenv(api["key_env"], "")
    if not key:
        raise ValueError(f"No key for {api['name']}")

    payload = {
        "model": api["model"],
        "max_tokens": 1000,
        "system": DAVOOD_HUNTER_AI_OS,
        "messages": [{"role": "user", "content": user_message}]
    }
    headers = {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    body = json.dumps(payload).encode()
    req = urllib.request.Request(api["url"], data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=40) as r:
        result = json.loads(r.read())

    raw = result["content"][0]["text"].strip()
    if raw.startswith("```"):
        raw = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(raw)


def ask_claude(alert_data: dict) -> dict:
    """
    Tries each API in order until one works.
    Falls back automatically if one fails.
    """
    user_message = build_user_message(alert_data)

    for api in APIS:
        key = os.getenv(api["key_env"], "")
        if not key:
            continue  # Skip if no key configured

        try:
            print(f"[AI] Trying {api['name']}...")
            if api["format"] == "anthropic":
                decision = _call_anthropic_format(api, user_message)
            else:
                decision = _call_openai_format(api, user_message)

            # Ensure required fields
            for k in ["action","score","confidence","entry","sl","tp",
                      "rr_ratio","reject_reasons","soft_rules_present"]:
                if k not in decision:
                    decision[k] = [] if k in ["reject_reasons","soft_rules_present"] else None

            score = decision.get("score") or 0
            print(f"[AI] OK {api['name']} -> {decision.get('action')} | Score: {score}/100")
            return decision

        except Exception as e:
            print(f"[AI] FAIL {api['name']}: {e}")
            continue

    print("[AI] All APIs failed - returning WAIT")
    return _wait("All APIs unavailable")


def _wait(reason: str) -> dict:
    return {
        "action": "WAIT", "score": 0, "confidence": 0,
        "entry": None, "sl": None, "tp": None, "rr_ratio": None,
        "session": "None", "killzone_active": False,
        "sweep_confirmed": False, "displacement_confirmed": False,
        "htf_bias": "NEUTRAL", "liquidity_level_swept": None,
        "soft_rules_present": [], "reject_reasons": [reason],
        "reasoning": f"System WAIT — {reason}",
        "similar_trade": "N/A", "risk_assessment": "HIGH",
        "news_check": "CAUTION"
    }
