import { ethereum, BigInt } from "@graphprotocol/graph-ts";
import {
  UsageMetricsHourlySnapshot,
  UsageMetricsDailySnapshot,
  FinancialsDailySnapshot,
  YieldAggregator,
} from "../../../../generated/schema";
import { BIGDECIMAL_ZERO } from "../../util/constants";

// ProtocolSnapshot takes care of taking snapshots of the Protocol.
// This should not be used directly, instead use the Protocol class.
export class ProtocolSnapshot {
  protocol: YieldAggregator;
  event: ethereum.Event;

  constructor(protocol: YieldAggregator, event: ethereum.Event) {
    this.protocol = protocol;
    this.event = event;
  }

  trackUserDailyActivity(count: i32): void {
    const s = this.loadCurrentUsageDailySnapshot();
    s.dailyActiveUsers += count;
    s.save();
  }

  trackUserHourlyActivity(count: i32): void {
    const s = this.loadCurrentUsageHourlySnapshot();
    s.hourlyActiveUsers += count;
    s.save();
  }

  takeSnapshots(): void {
    this.updateUsageDailySnapshot();
    this.updateUsageHourlySnapshot();
    this.updateFinancialsSnapshot();
  }

  loadCurrentUsageHourlySnapshot(): UsageMetricsHourlySnapshot {
    const hour = this.event.block.timestamp.div(BigInt.fromI32(3600));
    const snapshotID = hour.toString();
    let snapshot = UsageMetricsHourlySnapshot.load(snapshotID);
    if (snapshot) {
      return snapshot;
    }

    snapshot = new UsageMetricsHourlySnapshot(snapshotID);
    snapshot._previous = this.protocol.lastUsageHourlySnaphsot;
    snapshot.protocol = this.protocol.id;

    this.protocol.lastUsageHourlySnaphsot = snapshot.id;
    this.protocol.save();
    return snapshot;
  }

  loadCurrentUsageDailySnapshot(): UsageMetricsDailySnapshot {
    const day = this.event.block.timestamp.div(BigInt.fromI32(86400));
    const snapshotID = day.toString();
    let snapshot = UsageMetricsDailySnapshot.load(snapshotID);
    if (snapshot) {
      return snapshot;
    }

    snapshot = new UsageMetricsDailySnapshot(snapshotID);
    snapshot._previous = this.protocol.lastUsageDailySnaphsot;
    snapshot.protocol = this.protocol.id;

    this.protocol.lastUsageDailySnaphsot = snapshot.id;
    this.protocol.save();
    return snapshot;
  }

  loadCurrentFinancialsDailySnapshot(): FinancialsDailySnapshot {
    const day = this.event.block.timestamp.div(BigInt.fromI32(86400));
    const snapshotID = day.toString();
    let snapshot = FinancialsDailySnapshot.load(snapshotID);
    if (snapshot) {
      return snapshot;
    }

    snapshot = new FinancialsDailySnapshot(snapshotID);
    snapshot._previous = this.protocol.lastFinancialsSnapshot;
    snapshot.protocol = this.protocol.id;

    this.protocol.lastFinancialsSnapshot = snapshot.id;
    this.protocol.save();
    return snapshot;
  }

  updateUsageDailySnapshot(): void {
    const snapshot = this.loadCurrentUsageDailySnapshot();
    const protocol = this.protocol;
    const event = this.event;

    snapshot.cumulativeUniqueUsers = protocol.cumulativeUniqueUsers;
    snapshot.cumulativeTransactionCount = protocol.cumulativeTransactionCount;
    snapshot.cumulativeDepositCount = protocol.cumulativeDepositCount;
    snapshot.cumulativeWithdrawCount = protocol.cumulativeWithdrawCount;
    snapshot.totalPoolCount = protocol.totalPoolCount;
    snapshot.blockNumber = event.block.number;
    snapshot.timestamp = event.block.timestamp;

    // calcualte daily deltas
    let lastCumulativeUniqueUsers = 0;
    let lastCumulativeTransactionCount = 0;
    let lastCumulativeDepositCount = 0;
    let lastCumulativeWithdrawCount = 0;
    const previous = snapshot._previous;
    if (previous) {
      const prev = UsageMetricsDailySnapshot.load(previous)!;
      lastCumulativeUniqueUsers = prev.cumulativeUniqueUsers;
      lastCumulativeTransactionCount = prev.cumulativeTransactionCount;
      lastCumulativeDepositCount = prev.cumulativeDepositCount;
      lastCumulativeWithdrawCount = prev.cumulativeWithdrawCount;
    }

    snapshot.dailyActiveUsers =
      snapshot.cumulativeUniqueUsers - lastCumulativeUniqueUsers;
    snapshot.dailyTransactionCount =
      snapshot.cumulativeTransactionCount - lastCumulativeTransactionCount;
    snapshot.dailyDepositCount =
      snapshot.cumulativeDepositCount - lastCumulativeDepositCount;
    snapshot.dailyWithdrawCount =
      snapshot.cumulativeWithdrawCount - lastCumulativeWithdrawCount;
    snapshot.save();
  }

  updateUsageHourlySnapshot(): void {
    const snapshot = this.loadCurrentUsageHourlySnapshot();
    const protocol = this.protocol;
    const event = this.event;

    snapshot.cumulativeUniqueUsers = protocol.cumulativeUniqueUsers;
    snapshot.cumulativeTransactionCount = protocol.cumulativeTransactionCount;
    snapshot.cumulativeDepositCount = protocol.cumulativeDepositCount;
    snapshot.cumulativeWithdrawCount = protocol.cumulativeWithdrawCount;
    snapshot.blockNumber = event.block.number;
    snapshot.timestamp = event.block.timestamp;

    // calcualte hourly deltas
    let lastCumulativeUniqueUsers = 0;
    let lastCumulativeTransactionCount = 0;
    let lastCumulativeDepositCount = 0;
    let lastCumulativeWithdrawCount = 0;
    const previous = snapshot._previous;
    if (previous) {
      const prev = UsageMetricsHourlySnapshot.load(previous)!;
      lastCumulativeUniqueUsers = prev.cumulativeUniqueUsers;
      lastCumulativeTransactionCount = prev.cumulativeTransactionCount;
      lastCumulativeDepositCount = prev.cumulativeDepositCount;
      lastCumulativeWithdrawCount = prev.cumulativeWithdrawCount;
    }

    snapshot.hourlyActiveUsers =
      snapshot.cumulativeUniqueUsers - lastCumulativeUniqueUsers;
    snapshot.hourlyTransactionCount =
      snapshot.cumulativeTransactionCount - lastCumulativeTransactionCount;
    snapshot.hourlyDepositCount =
      snapshot.cumulativeDepositCount - lastCumulativeDepositCount;
    snapshot.hourlyWithdrawCount =
      snapshot.cumulativeWithdrawCount - lastCumulativeWithdrawCount;
    snapshot.save();
  }

  updateFinancialsSnapshot(): void {
    const snapshot = this.loadCurrentFinancialsDailySnapshot();
    const protocol = this.protocol;
    const event = this.event;

    snapshot.totalValueLockedUSD = protocol.totalValueLockedUSD;
    snapshot.protocolControlledValueUSD = protocol.protocolControlledValueUSD;
    snapshot.cumulativeSupplySideRevenueUSD =
      protocol.cumulativeSupplySideRevenueUSD;
    snapshot.cumulativeProtocolSideRevenueUSD =
      protocol.cumulativeProtocolSideRevenueUSD;
    snapshot.cumulativeTotalRevenueUSD = protocol.cumulativeTotalRevenueUSD;
    snapshot.blockNumber = event.block.number;
    snapshot.timestamp = event.block.timestamp;

    // calculate daily deltas
    let lastSupplySideRevenue = BIGDECIMAL_ZERO;
    let lastProtocolSideRevenue = BIGDECIMAL_ZERO;
    let lastTotalRevenue = BIGDECIMAL_ZERO;
    if (snapshot._previous) {
      const prev = FinancialsDailySnapshot.load(snapshot._previous!)!;
      lastSupplySideRevenue = prev.cumulativeSupplySideRevenueUSD;
      lastProtocolSideRevenue = prev.cumulativeProtocolSideRevenueUSD;
      lastTotalRevenue = prev.cumulativeTotalRevenueUSD;
    }
    snapshot.dailyProtocolSideRevenueUSD =
      protocol.cumulativeProtocolSideRevenueUSD.minus(lastProtocolSideRevenue);
    snapshot.dailySupplySideRevenueUSD =
      protocol.cumulativeSupplySideRevenueUSD.minus(lastSupplySideRevenue);
    snapshot.dailyTotalRevenueUSD =
      protocol.cumulativeTotalRevenueUSD.minus(lastTotalRevenue);
    snapshot.save();
  }
}
