import Float "mo:core/Float";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";

actor {
  type Ticker = {
    open : Float;
    high : Float;
    low : Float;
    close : Float;
    volume : Float;
    timestamp : Int;
  };

  type Pnl = Float;
  type TradingPrice = Float;
  type TradingStats = {
    totalPnl : Pnl;
    netProfit : Pnl;
    tradeCount : Nat;
    winRate : Float;
    avgMfe : Float;
    avgMae : Float;
    avgTradePnl : Pnl;
    winCount : Nat;
    lossCount : Nat;
  };

  type TradeType = { #long; #short };
  type Status = { #open; #closed };
  type PositionType = { #exclusive; #open };

  type Trade = {
    id : Nat;
    asset : Text;
    tradeType : TradeType;
    quantity : Float;
    entryPrice : Float;
    currentPrice : Float;
    status : Status;
    pnl : Pnl;
    mfe : Float;
    mae : Float;
    timestamp : Int;
  };

  module Trade {
    public func compare(trade1 : Trade, trade2 : Trade) : Order.Order {
      Nat.compare(trade1.id, trade2.id);
    };
  };

  module TradeId {
    public func compare(id1 : Nat, id2 : Nat) : Order.Order {
      Nat.compare(id1, id2);
    };
  };

  let trades = Map.empty<Nat, Trade>();
  var nextId = 1;

  // US10Y yield daily snapshots: dateLabel (e.g. "2026-04-08") -> yield value
  let us10ySnapshots = Map.empty<Text, Float>();

  public shared ({ caller }) func addTrade(trade : Trade) : async Nat {
    let newTrade = {
      trade with
      id = nextId;
    };
    trades.add(nextId, newTrade);
    let id = nextId;
    nextId += 1;
    id;
  };

  public query ({ caller }) func getTrade(id : Nat) : async Trade {
    switch (trades.get(id)) {
      case (null) { Runtime.trap("Trade does not exist") };
      case (?trade) { trade };
    };
  };

  public query ({ caller }) func getAllTrades() : async [Trade] {
    trades.values().toArray().sort();
  };

  public shared ({ caller }) func updateTrade(trade : Trade) : async () {
    if (not trades.containsKey(trade.id)) { Runtime.trap("Trade does not exist") };
    trades.add(trade.id, trade);
  };

  public shared ({ caller }) func closeTrade(id : Nat, finalPrice : Float) : async () {
    switch (trades.get(id)) {
      case (null) { Runtime.trap("Trade does not exist") };
      case (?trade) {
        let updatedTrade = {
          trade with
          currentPrice = finalPrice;
          status = #closed;
          pnl = calculatePnl(trade.tradeType, trade.entryPrice, finalPrice, trade.quantity);
        };
        trades.add(id, updatedTrade);
      };
    };
  };

  public shared ({ caller }) func deleteTrade(id : Nat) : async () {
    if (not trades.containsKey(id)) { Runtime.trap("Trade does not exist") };
    trades.remove(id);
  };

  func calculatePnl(tradeType : TradeType, entryPrice : Float, exitPrice : Float, quantity : Float) : TradingPrice {
    switch (tradeType) {
      case (#long) { (exitPrice - entryPrice) * quantity };
      case (#short) { (entryPrice - exitPrice) * quantity };
    };
  };

  public query ({ caller }) func getTradingStats() : async TradingStats {
    var totalPnl : Float = 0.0;
    var tradeCount = 0;
    var winCount = 0;
    var lossCount = 0;
    var totalMfe : Float = 0.0;
    var totalMae : Float = 0.0;
    var totalTradePnl : Float = 0.0;

    trades.values().forEach(func(trade) { if (trade.status == #closed) {
      tradeCount += 1;
      totalPnl += trade.pnl;
      totalMfe += trade.mfe;
      totalMae += trade.mae;
      totalTradePnl += trade.pnl;

      if (trade.pnl > 0.0) { winCount += 1 } else {
        lossCount += 1;
      };
    } });

    let winRate = if (tradeCount > 0) { (winCount.toFloat() / tradeCount.toFloat()) * 100.0 } else {
      0.0;
    };

    let avgMfe = if (tradeCount > 0) { totalMfe / tradeCount.toFloat() } else { 0.0 };

    let avgMae = if (tradeCount > 0) { totalMae / tradeCount.toFloat() } else { 0.0 };

    let avgTradePnl = if (tradeCount > 0) {
      totalTradePnl / tradeCount.toFloat();
    } else { 0.0 };

    {
      totalPnl;
      netProfit = totalPnl;
      tradeCount;
      winRate;
      avgMfe;
      avgMae;
      avgTradePnl;
      winCount;
      lossCount;
    };
  };

  func createSampleTrade(id : Nat, asset : Text, tradeType : TradeType, quantity : Float, entryPrice : Float, currentPrice : Float, status : Status, pnl : Float, mfe : Float, mae : Float, timestamp : Int) : Trade {
    {
      id;
      asset;
      tradeType;
      quantity;
      entryPrice;
      currentPrice;
      status;
      pnl;
      mfe;
      mae;
      timestamp;
    };
  };

  public shared ({ caller }) func seedSampleTrades() : async () {
    let trade1 = createSampleTrade(1, "BTC", #long, 0.5, 45000.0, 47000.0, #closed, 1000.0, 1500.0, 500.0, 1646200000);
    let trade2 = createSampleTrade(2, "ETH", #short, 2.0, 3000.0, 2800.0, #closed, 400.0, 600.0, 250.0, 1646300000);
    let trade3 = createSampleTrade(3, "BTC", #long, 1.0, 48000.0, 47500.0, #closed, -50.0, 200.0, 100.0, 1646400000);
    let trade4 = createSampleTrade(4, "ETH", #short, 1.5, 3200.0, 3150.0, #open, 75.0, 85.0, 40.0, 1646500000);
    let trade5 = createSampleTrade(5, "BTC", #long, 0.3, 46000.0, 46500.0, #open, 150.0, 200.0, 80.0, 1646600000);

    trades.add(trade1.id, trade1);
    trades.add(trade2.id, trade2);
    trades.add(trade3.id, trade3);
    trades.add(trade4.id, trade4);
    trades.add(trade5.id, trade5);

    nextId := 6;
  };

  // Records a US10Y yield snapshot for a given date label (e.g. "2026-04-08").
  // Overwrites any existing value for that date, then trims to the last 30 entries.
  public shared ({ caller }) func recordUS10YSnapshot(value : Float, dateLabel : Text) : async () {
    us10ySnapshots.add(dateLabel, value);
    // Trim to last 30 entries: remove the oldest keys if we exceed 30
    if (us10ySnapshots.size() > 30) {
      let sorted = us10ySnapshots.keys().toArray().sort();
      let excess = us10ySnapshots.size() - 30 : Nat;
      var i = 0;
      while (i < excess) {
        us10ySnapshots.remove(sorted[i]);
        i += 1;
      };
    };
  };

  // Returns all stored US10Y snapshots sorted by dateLabel ascending (oldest first).
  public query ({ caller }) func getUS10YHistory() : async [(Text, Float)] {
    let entries = us10ySnapshots.entries().toArray();
    entries.sort(func((a, _) : (Text, Float), (b, _) : (Text, Float)) : Order.Order {
      Text.compare(a, b)
    });
  };
};
