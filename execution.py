# ============================================================
#  DAVOOD HUNTER AI OS v1.0 — TRADE EXECUTION
#  Paper mode / CCXT (crypto) / MetaTrader 5
# ============================================================

from datetime import datetime, timezone
from config import (
    BROKER, PAPER_MODE, EXCHANGE_API_KEY, EXCHANGE_SECRET, EXCHANGE_ID,
    RISK_PER_TRADE
)


class PaperBroker:
    def __init__(self):
        self.balance = 10000.0
        self.positions = []
        self.trades = []

    def get_balance(self):
        return self.balance

    def open_position(self, symbol, direction, entry, sl, tp, lot_size):
        trade = {
            "id": f"PAPER-{len(self.trades)+1:06d}",
            "symbol": symbol,
            "direction": direction,
            "entry": entry,
            "sl": sl,
            "tp": tp,
            "lot_size": lot_size,
            "opened_at": datetime.now(timezone.utc).isoformat(),
            "status": "OPEN"
        }
        self.positions.append(trade)
        return trade

    def close_position(self, trade_id, exit_price=None):
        for pos in self.positions:
            if pos["id"] == trade_id:
                pos["status"] = "CLOSED"
                pos["closed_at"] = datetime.now(timezone.utc).isoformat()
                if exit_price:
                    pos["exit_price"] = exit_price
                self.trades.append(pos)
                self.positions.remove(pos)
                return pos
        return None


class CCXTBroker:
    def __init__(self):
        self.exchange = None
        self._init_exchange()

    def _init_exchange(self):
        try:
            import ccxt
            exchange_class = getattr(ccxt, EXCHANGE_ID, None)
            if exchange_class is None:
                print(f"[EXEC] Exchange '{EXCHANGE_ID}' not found, falling back to Paper")
                return
            self.exchange = exchange_class({
                "apiKey": EXCHANGE_API_KEY,
                "secret": EXCHANGE_SECRET,
                "enableRateLimit": True,
                "options": {"defaultType": "spot"}
            })
            self.exchange.load_markets()
            print(f"[EXEC] CCXT connected to {EXCHANGE_ID}")
        except ImportError:
            print("[EXEC] ccxt not installed. Run: pip install ccxt")
        except Exception as e:
            print(f"[EXEC] CCXT init error: {e}")

    def get_balance(self):
        if not self.exchange:
            return 0.0
        try:
            bal = self.exchange.fetch_balance()
            return float(bal.get("total", {}).get("USDT", 0))
        except Exception as e:
            print(f"[EXEC] Balance error: {e}")
            return 0.0

    def open_position(self, symbol, direction, entry, sl, tp, lot_size):
        if not self.exchange:
            return None
        try:
            side = "buy" if direction == "LONG" else "sell"
            order = self.exchange.create_order(
                symbol=symbol,
                type="market",
                side=side,
                amount=lot_size
            )
            return {
                "id": order["id"],
                "symbol": symbol,
                "direction": direction,
                "entry": order.get("average", entry),
                "sl": sl,
                "tp": tp,
                "lot_size": lot_size,
                "opened_at": datetime.now(timezone.utc).isoformat(),
                "status": "OPEN"
            }
        except Exception as e:
            print(f"[EXEC] Order error: {e}")
            return None


def get_broker():
    if PAPER_MODE:
        print("[EXEC] Paper mode — virtual trades only")
        return PaperBroker()
    elif BROKER == "ccxt":
        broker = CCXTBroker()
        if broker.exchange:
            return broker
        print("[EXEC] CCXT failed, falling back to Paper")
        return PaperBroker()
    else:
        print(f"[EXEC] Unknown broker '{BROKER}', using Paper mode")
        return PaperBroker()


def calculate_lot_size(balance: float, entry: float, sl: float) -> float:
    risk_usd = balance * RISK_PER_TRADE
    sl_distance = abs(entry - sl)
    if sl_distance <= 0:
        return 0.0
    lot_size = risk_usd / sl_distance
    return round(lot_size, 4)


def execute_trade(decision: dict, alert_data: dict, broker, decision_id: int = 0) -> dict:
    action = decision.get("action")
    if action not in ("LONG", "SHORT"):
        return {"success": False, "reason": "Not a trade signal"}

    entry = decision.get("entry")
    sl = decision.get("sl")
    tp = decision.get("tp")
    rr = decision.get("rr_ratio")

    if not all([entry, sl, tp]):
        return {"success": False, "reason": "Missing entry/SL/TP"}

    try:
        entry = float(entry)
        sl = float(sl)
        tp = float(tp)
    except (TypeError, ValueError):
        return {"success": False, "reason": "Invalid price values"}

    if rr and float(rr) < 2.5:
        return {"success": False, "reason": "R:R below 2.5 hard rule"}

    symbol = alert_data.get("symbol", "XAUUSD")

    try:
        balance = broker.get_balance()
    except Exception:
        balance = 10000.0

    lot_size = calculate_lot_size(balance, entry, sl)
    if lot_size <= 0:
        return {"success": False, "reason": "Invalid lot size calculation"}

    result = broker.open_position(symbol, action, entry, sl, tp, lot_size)

    if result:
        print(f"[EXEC] {'🟢' if action == 'LONG' else '🔴'} {action} {symbol} @ {entry} | SL={sl} TP={tp} | Lot={lot_size}")
        return {
            "success": True,
            "trade_id": result.get("id"),
            "symbol": symbol,
            "direction": action,
            "entry": entry,
            "sl": sl,
            "tp": tp,
            "lot_size": lot_size,
            "risk_usd": round(balance * RISK_PER_TRADE, 2)
        }
    else:
        return {"success": False, "reason": "Broker rejected order"}
