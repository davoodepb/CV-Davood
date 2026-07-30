# ============================================================
#  DAVOOD HUNTER AI OS v1.0 — EXECUTION ENGINE
#  Paper Broker (default) + CCXT + MT5
#  Includes trade close detection + SL/TP hit polling
# ============================================================

import threading
import time
from datetime import datetime, timezone
from config import BROKER, EXCHANGE_API_KEY, EXCHANGE_SECRET, PAPER_MODE
from risk_manager import calculate_lot_size
from journal import log_trade_open, log_trade_close, get_open_trades
from telegram_alerts import send_telegram_sync


class PaperBroker:
    def __init__(self):
        self.balance = 10_000.0
        self.orders = []
        self.price_cache = {}
        print("[PAPER] Paper broker active — Balance: $10,000")

    def get_balance(self):
        return self.balance

    def place_order(self, symbol, side, lot_size, entry, sl, tp):
        order = {
            "id": f"PAPER-{len(self.orders)+1:04d}",
            "symbol": symbol, "side": side,
            "lot_size": lot_size, "entry": entry,
            "sl": sl, "tp": tp, "status": "filled",
            "time": datetime.now(timezone.utc).isoformat()
        }
        self.orders.append(order)
        print(f"[PAPER] ✅ {side} {lot_size} {symbol} @ {entry} | SL:{sl} TP:{tp}")
        return order

    def get_price(self, symbol):
        return self.price_cache.get(symbol, 0)

    def update_price(self, symbol, price):
        self.price_cache[symbol] = price


class CCXTBroker:
    def __init__(self):
        try:
            import ccxt
            self.exchange = ccxt.bybit({
                "apiKey": EXCHANGE_API_KEY,
                "secret": EXCHANGE_SECRET,
                "enableRateLimit": True,
            })
            print(f"[CCXT] Connected to Bybit")
        except ImportError:
            raise ImportError("Run: pip install ccxt")

    def get_balance(self):
        b = self.exchange.fetch_balance()
        return float(b.get("USDT", {}).get("free", 0))

    def place_order(self, symbol, side, lot_size, entry, sl, tp):
        order = self.exchange.create_order(
            symbol=symbol, type="limit",
            side=side.lower(), amount=lot_size, price=entry,
            params={"stopLoss": {"triggerPrice": sl}, "takeProfit": {"triggerPrice": tp}}
        )
        print(f"[CCXT] ✅ Order {order['id']} — {side} {lot_size} @ {entry}")
        return order

    def get_price(self, symbol):
        try:
            ticker = self.exchange.fetch_ticker(symbol)
            return ticker["last"]
        except:
            return 0


def get_broker():
    if PAPER_MODE:
        print("[BROKER] PAPER MODE — No real money at risk")
        return PaperBroker()
    elif "ccxt" in BROKER.lower() or "bybit" in BROKER.lower():
        return CCXTBroker()
    else:
        print("[BROKER] Unknown broker — defaulting to paper")
        return PaperBroker()


def execute_trade(decision: dict, alert_data: dict, broker, decision_id: int) -> dict:
    symbol  = alert_data.get("symbol", "XAUUSD")
    side    = decision["action"]
    entry   = float(decision["entry"])
    sl      = float(decision["sl"])
    tp      = float(decision["tp"])

    try:
        balance = broker.get_balance()
    except:
        balance = 10_000.0

    lot_size, risk_usd = calculate_lot_size(balance, entry, sl, symbol)
    print(f"[EXEC] {side} {symbol} | Entry:{entry} SL:{sl} TP:{tp} | Lot:{lot_size} Risk:${risk_usd}")

    try:
        order = broker.place_order(symbol, side, lot_size, entry, sl, tp)
        trade_id = log_trade_open(
            decision_id=decision_id, symbol=symbol, side=side,
            entry=entry, sl=sl, tp=tp, lot_size=lot_size, risk_usd=risk_usd,
            score=decision.get("score"),
            session=decision.get("session"),
            setup_type=decision.get("setup_type"),
            soft_rules=decision.get("soft_rules_present"),
            sweep_level=decision.get("liquidity_level_swept"),
            confirmation="displacement" if decision.get("displacement_confirmed") else "none",
            htf_bias=decision.get("htf_bias"),
            killzone=decision.get("session"),
            reasoning=decision.get("reasoning"),
            similar_trade=decision.get("similar_trade"),
            risk_assessment=decision.get("risk_assessment")
        )
        return {"success": True, "trade_id": trade_id, "order_id": order.get("id"),
                "lot_size": lot_size, "risk_usd": risk_usd}
    except Exception as e:
        print(f"[EXEC] ❌ Order failed: {e}")
        return {"success": False, "error": str(e)}


def check_trade_close(trade: dict, current_price: float) -> tuple:
    """
    Check if a trade should be closed based on current price.
    Returns (should_close, close_price, pnl_usd, pnl_r)
    """
    entry = trade["entry"]
    sl = trade["sl"]
    tp = trade["tp"]
    side = trade["side"]
    lot_size = trade["lot_size"]
    risk_usd = trade["risk_usd"]

    sl_distance = abs(entry - sl)
    tp_distance = abs(tp - entry)

    if side == "LONG":
        if current_price <= sl:
            pnl_usd = -risk_usd
            pnl_r = -1.0
            return True, sl, pnl_usd, pnl_r
        if current_price >= tp:
            pnl_usd = risk_usd * (tp_distance / sl_distance)
            pnl_r = tp_distance / sl_distance
            return True, tp, pnl_usd, pnl_r
    elif side == "SHORT":
        if current_price >= sl:
            pnl_usd = -risk_usd
            pnl_r = -1.0
            return True, sl, pnl_usd, pnl_r
        if current_price <= tp:
            pnl_usd = risk_usd * (tp_distance / sl_distance)
            pnl_r = tp_distance / sl_distance
            return True, tp, pnl_usd, pnl_r

    return False, None, 0, 0


def poll_trade_closes(broker):
    """Background thread that polls for trade closes"""
    print("[POLL] Trade close poller started")
    while True:
        try:
            open_trades = get_open_trades()
            if not open_trades:
                time.sleep(10)
                continue

            for trade in open_trades:
                try:
                    current_price = broker.get_price(trade["symbol"])
                    if current_price == 0:
                        continue

                    should_close, close_price, pnl_usd, pnl_r = check_trade_close(trade, current_price)

                    if should_close:
                        log_trade_close(trade["id"], close_price, pnl_usd, pnl_r)

                        result = "WIN" if pnl_usd > 0 else "LOSS"
                        msg = (
                            f"{'🟢' if pnl_usd > 0 else '🔴'} TRADE CLOSED — {result}\n"
                            f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
                            f"Symbol: {trade['symbol']}\n"
                            f"Side: {trade['side']}\n"
                            f"Entry: {trade['entry']}\n"
                            f"Close: {close_price}\n"
                            f"P/L: {pnl_usd:+.2f} USD ({pnl_r:+.1f}R)\n"
                            f"━━━━━━━━━━━━━━━━━━━━━━━━"
                        )
                        send_telegram_sync(msg)
                        print(f"[POLL] Trade {trade['id']} closed: {result} ({pnl_usd:+.2f} USD)")

                except Exception as e:
                    print(f"[POLL] Error checking trade {trade['id']}: {e}")

            time.sleep(5)
        except Exception as e:
            print(f"[POLL] Error in poller: {e}")
            time.sleep(10)


def start_trade_poller(broker):
    t = threading.Thread(target=poll_trade_closes, args=(broker,), daemon=True)
    t.start()
