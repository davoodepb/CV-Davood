# ============================================================
#  DAVOOD HUNTER AI OS v1.0 — AI BRAIN
#  3 Providers with Auto-Fallback:
#  OpenRouter → NVIDIA → Kimi → (Claude/OpenAI if available)
#  When one runs out of credits, next one takes over
# ============================================================

import json
import urllib.request
import urllib.error

from config import (
    OPENROUTER_API_KEY, NVIDIA_API_KEY, KIMI_API_KEY,
    CLAUDE_API_KEY, OPENAI_API_KEY,
    AI_MODEL, AI_MAX_TOKENS
)

try:
    from DAVOOD_HUNTER_AI_OS_v1 import DAVOOD_HUNTER_AI_OS
except ImportError:
    DAVOOD_HUNTER_AI_OS = "You are a trading AI assistant."


def _build_user_message(alert_data: dict) -> str:
    return f"""
INCOMING MARKET ALERT — Run full DAVOOD HUNTER AI OS analysis:

Symbol: {alert_data.get('symbol')}
Event: {alert_data.get('event')}
Price: {alert_data.get('price')}
Session: {alert_data.get('session')}
Timeframe: {alert_data.get('timeframe', '5')}
HTF Bias: {alert_data.get('htf_bias')}
Liquidity Level: {alert_data.get('liquidity_level')}
ATR: {alert_data.get('atr')}
Swept: Low={alert_data.get('swept_low', False)} | High={alert_data.get('swept_high', False)}
Closed Back Inside: {alert_data.get('closed_back_inside', False)}
Displacement Candle: {alert_data.get('displacement_candle', False)}
FVG Present: {alert_data.get('fvg_present', False)}
BOS Confirmed: {alert_data.get('bos_confirmed', False)}
SMT Divergence: {alert_data.get('smt_divergence', False)}
Volume Spike: {alert_data.get('volume_spike', False)}
Order Block: {alert_data.get('order_block', False)}
Score Hint: {alert_data.get('score_hint', 'N/A')}
Notes: {alert_data.get('notes', 'No additional notes')}

Run the complete Decision Engine (Module 17).
Calculate Score (Module 18).
Apply all Hard Rules (Module 10).
Check Psychology (Module 16).
Think like Da Vood.
Return ONLY valid JSON — no markdown, no explanation outside JSON.
"""


def _parse_response(raw_text: str) -> dict:
    raw_text = raw_text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.replace("```json", "").replace("```", "").strip()
    # Handle providers that return whitespace before JSON
    raw_text = raw_text.strip()
    start = raw_text.find("{")
    end = raw_text.rfind("}") + 1
    if start != -1 and end > start:
        raw_text = raw_text[start:end]
    return json.loads(raw_text)


# ─── PROVIDER 1: OPENROUTER (DeepSeek — cheapest) ────────────
def _call_openrouter(api_key: str, user_msg: str) -> dict:
    body = json.dumps({
        "model": "deepseek/deepseek-chat",
        "max_tokens": AI_MAX_TOKENS,
        "messages": [
            {"role": "system", "content": DAVOOD_HUNTER_AI_OS},
            {"role": "user", "content": user_msg}
        ]
    }).encode()

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://tradingroomhunter.com"
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        result = json.loads(r.read())
    return _parse_response(result["choices"][0]["message"]["content"])


# ─── PROVIDER 2: NVIDIA (free tier) ──────────────────────────
def _call_nvidia(api_key: str, user_msg: str) -> dict:
    body = json.dumps({
        "model": "meta/llama-3.1-70b-instruct",
        "max_tokens": AI_MAX_TOKENS,
        "temperature": 0.1,
        "messages": [
            {"role": "system", "content": DAVOOD_HUNTER_AI_OS},
            {"role": "user", "content": user_msg}
        ]
    }).encode()

    req = urllib.request.Request(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        result = json.loads(r.read())
    return _parse_response(result["choices"][0]["message"]["content"])


# ─── PROVIDER 3: KIMI / MOONSHOT ────────────────────────────
def _call_kimi(api_key: str, user_msg: str) -> dict:
    body = json.dumps({
        "model": "moonshot-v1-32k",
        "max_tokens": AI_MAX_TOKENS,
        "temperature": 0.1,
        "messages": [
            {"role": "system", "content": DAVOOD_HUNTER_AI_OS},
            {"role": "user", "content": user_msg}
        ]
    }).encode()

    req = urllib.request.Request(
        "https://api.moonshot.cn/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        result = json.loads(r.read())
    return _parse_response(result["choices"][0]["message"]["content"])


# ─── PROVIDER 4: CLAUDE (if credits added later) ────────────
def _call_anthropic(api_key: str, user_msg: str) -> dict:
    body = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": AI_MAX_TOKENS,
        "system": DAVOOD_HUNTER_AI_OS,
        "messages": [{"role": "user", "content": user_msg}]
    }).encode()

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
    with urllib.request.urlopen(req, timeout=90) as r:
        result = json.loads(r.read())
    return _parse_response(result["content"][0]["text"])


# ─── PROVIDER 5: OPENAI (if key added later) ────────────────
def _call_openai(api_key: str, user_msg: str) -> dict:
    body = json.dumps({
        "model": "gpt-4o",
        "max_tokens": AI_MAX_TOKENS,
        "messages": [
            {"role": "system", "content": DAVOOD_HUNTER_AI_OS},
            {"role": "user", "content": user_msg}
        ]
    }).encode()

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        result = json.loads(r.read())
    return _parse_response(result["choices"][0]["message"]["content"])


# ─── FALLBACK: NO PROVIDERS AVAILABLE ────────────────────────
def _fallback_wait(alert_data: dict) -> dict:
    return {
        "action": "WAIT",
        "score": 0,
        "confidence": 0,
        "entry": None,
        "sl": None,
        "tp": None,
        "rr_ratio": None,
        "session": alert_data.get("session", "None"),
        "killzone_active": False,
        "sweep_confirmed": alert_data.get("swept_low", False) or alert_data.get("swept_high", False),
        "displacement_confirmed": alert_data.get("displacement_candle", False),
        "htf_bias": alert_data.get("htf_bias", "NEUTRAL"),
        "liquidity_level_swept": alert_data.get("liquidity_level"),
        "soft_rules_present": [],
        "reject_reasons": ["ALL_AI_PROVIDERS_FAILED — Check API keys and credits in .env"],
        "reasoning": "All AI providers failed. OpenRouter/NVIDIA/Kimi keys may need credits. Check .env",
        "similar_trade": "N/A",
        "risk_assessment": "HIGH",
        "news_check": "CAUTION"
    }


# ─── MAIN FUNCTION: ASK THE AI BRAIN ─────────────────────────
def ask_claude(alert_data: dict) -> dict:
    user_msg = _build_user_message(alert_data)

    # Build provider list — tries each in order, falls back to next
    providers = []

    # 1. OpenRouter (DeepSeek — cheapest, ~$0.14/M tokens)
    if OPENROUTER_API_KEY and "YOUR_KEY" not in OPENROUTER_API_KEY:
        providers.append(("OpenRouter", OPENROUTER_API_KEY, _call_openrouter))

    # 2. NVIDIA (free tier — Llama 3.1 70B)
    if NVIDIA_API_KEY and "YOUR_KEY" not in NVIDIA_API_KEY:
        providers.append(("NVIDIA", NVIDIA_API_KEY, _call_nvidia))

    # 3. Kimi / Moonshot (32K context)
    if KIMI_API_KEY and "YOUR_KEY" not in KIMI_API_KEY:
        providers.append(("Kimi", KIMI_API_KEY, _call_kimi))

    # 4. Claude (if credits added later)
    if CLAUDE_API_KEY and "YOUR_KEY" not in CLAUDE_API_KEY:
        providers.append(("Claude", CLAUDE_API_KEY, _call_anthropic))

    # 5. OpenAI (if key added later)
    if OPENAI_API_KEY and "YOUR_KEY" not in OPENAI_API_KEY:
        providers.append(("OpenAI", OPENAI_API_KEY, _call_openai))

    if not providers:
        print("[AI BRAIN] WARNING: No API keys configured!")
        return _fallback_wait(alert_data)

    # Try each provider in order — if one fails, try next
    last_error = None
    for name, key, caller in providers:
        try:
            print(f"[AI BRAIN] Calling {name}...")
            decision = caller(key, user_msg)
            action = decision.get("action", "?")
            score = decision.get("score", 0)
            print(f"[AI BRAIN] {name} OK: {action} score={score}")
            return decision
        except urllib.error.HTTPError as e:
            last_error = f"{name} HTTP {e.code}"
            body_err = ""
            try:
                body_err = e.read().decode()[:200]
            except:
                pass
            print(f"[AI BRAIN] {name} failed (HTTP {e.code}): {body_err}")
            continue
        except Exception as e:
            last_error = f"{name}: {e}"
            print(f"[AI BRAIN] {name} failed: {e}")
            continue

    print(f"[AI BRAIN] ALL PROVIDERS FAILED. Last: {last_error}")
    return _fallback_wait(alert_data)
