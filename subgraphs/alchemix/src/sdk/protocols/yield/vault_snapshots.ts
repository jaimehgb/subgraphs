import { ethereum, BigInt } from "@graphprotocol/graph-ts";
import {
  VaultDailySnapshot,
  VaultHourlySnapshot,
} from "../../../../generated/schema";
import { BIGDECIMAL_ZERO } from "../../util/constants";
import { Vault } from "./vault";

// VaultSnapshot takes care of taking snapshots of the vaults.
// This should not be used directly, instead use the Vault class.
export class VaultSnapshot {
  static takeSnapshots(vault: Vault, event: ethereum.Event): void {
    const hourly = VaultSnapshot.loadCurrentHourlySnapshot(vault, event);
    const daily = VaultSnapshot.loadCurrentDailySnapshot(vault, event);
    vault.vault.lastHourlySnapshot = hourly.id;
    vault.vault.lastDailySnapshot = daily.id;
    vault.vault.save();

    VaultSnapshot.updateDailySnapshot(daily, vault, event);
    VaultSnapshot.updateHourlySnapshot(hourly, vault, event);
  }

  private static loadCurrentHourlySnapshot(
    vault: Vault,
    event: ethereum.Event
  ): VaultHourlySnapshot {
    const hour = event.block.timestamp.div(BigInt.fromI32(3600));
    const snapshotID = `${vault.vault.id}-${hour.toString()}`;
    let snapshot = VaultHourlySnapshot.load(snapshotID);
    if (snapshot) {
      return snapshot;
    }

    snapshot = new VaultHourlySnapshot(snapshotID);
    snapshot._previous = vault.vault.lastHourlySnapshot;
    snapshot.protocol = vault.vault.protocol;
    snapshot.vault = vault.vault.id;
    return snapshot;
  }

  private static loadCurrentDailySnapshot(
    vault: Vault,
    event: ethereum.Event
  ): VaultDailySnapshot {
    const day = event.block.timestamp.div(BigInt.fromI32(86400));
    const snapshotID = `${vault.vault.id}-${day.toString()}`;
    let snapshot = VaultDailySnapshot.load(snapshotID);
    if (snapshot) {
      return snapshot;
    }

    snapshot = new VaultDailySnapshot(snapshotID);
    snapshot._previous = vault.vault.lastDailySnapshot;
    snapshot.protocol = vault.vault.protocol;
    snapshot.vault = vault.vault.id;
    return snapshot;
  }

  private static updateDailySnapshot(
    snapshot: VaultDailySnapshot,
    vault: Vault,
    event: ethereum.Event
  ): void {
    snapshot.totalValueLockedUSD = vault.vault.totalValueLockedUSD;
    snapshot.cumulativeSupplySideRevenueUSD =
      vault.vault.cumulativeSupplySideRevenueUSD;
    snapshot.cumulativeProtocolSideRevenueUSD =
      vault.vault.cumulativeProtocolSideRevenueUSD;
    snapshot.cumulativeTotalRevenueUSD = vault.vault.cumulativeTotalRevenueUSD;
    snapshot.inputTokenBalance = vault.vault.inputTokenBalance;
    snapshot.outputTokenSupply = vault.vault.outputTokenSupply;
    snapshot.outputTokenPriceUSD = vault.vault.outputTokenPriceUSD;
    snapshot.pricePerShare = vault.vault.pricePerShare;
    snapshot.stakedOutputTokenAmount = vault.vault.stakedOutputTokenAmount;
    snapshot.rewardTokenEmissionsAmount =
      vault.vault.rewardTokenEmissionsAmount;
    snapshot.rewardTokenEmissionsUSD = vault.vault.rewardTokenEmissionsUSD;
    snapshot.timestamp = event.block.timestamp;
    snapshot.blockNumber = event.block.number;

    // calculate daily deltas
    let lastCumulativeSupplySideRevenueUSD = BIGDECIMAL_ZERO;
    let lastCumulativeProtocolSideRevenueUSD = BIGDECIMAL_ZERO;
    let lastCumulativeTotalRevenueUSD = BIGDECIMAL_ZERO;
    const previous = snapshot._previous;
    if (previous) {
      const prev = VaultDailySnapshot.load(previous)!;
      lastCumulativeSupplySideRevenueUSD = prev.cumulativeSupplySideRevenueUSD;
      lastCumulativeProtocolSideRevenueUSD =
        prev.cumulativeProtocolSideRevenueUSD;
      lastCumulativeTotalRevenueUSD = prev.cumulativeTotalRevenueUSD;
    }

    snapshot.dailySupplySideRevenueUSD =
      snapshot.cumulativeSupplySideRevenueUSD.minus(
        lastCumulativeSupplySideRevenueUSD
      );
    snapshot.dailyProtocolSideRevenueUSD =
      snapshot.cumulativeProtocolSideRevenueUSD.minus(
        lastCumulativeProtocolSideRevenueUSD
      );
    snapshot.dailyTotalRevenueUSD = snapshot.cumulativeTotalRevenueUSD.minus(
      lastCumulativeTotalRevenueUSD
    );
    snapshot.save();
  }

  private static updateHourlySnapshot(
    snapshot: VaultHourlySnapshot,
    vault: Vault,
    event: ethereum.Event
  ): void {
    snapshot.totalValueLockedUSD = vault.vault.totalValueLockedUSD;
    snapshot.cumulativeSupplySideRevenueUSD =
      vault.vault.cumulativeSupplySideRevenueUSD;
    snapshot.cumulativeProtocolSideRevenueUSD =
      vault.vault.cumulativeProtocolSideRevenueUSD;
    snapshot.cumulativeTotalRevenueUSD = vault.vault.cumulativeTotalRevenueUSD;
    snapshot.inputTokenBalance = vault.vault.inputTokenBalance;
    snapshot.outputTokenSupply = vault.vault.outputTokenSupply;
    snapshot.outputTokenPriceUSD = vault.vault.outputTokenPriceUSD;
    snapshot.pricePerShare = vault.vault.pricePerShare;
    snapshot.stakedOutputTokenAmount = vault.vault.stakedOutputTokenAmount;
    snapshot.rewardTokenEmissionsAmount =
      vault.vault.rewardTokenEmissionsAmount;
    snapshot.rewardTokenEmissionsUSD = vault.vault.rewardTokenEmissionsUSD;
    snapshot.timestamp = event.block.timestamp;
    snapshot.blockNumber = event.block.number;

    // calculate hourly deltas
    let lastCumulativeSupplySideRevenueUSD = BIGDECIMAL_ZERO;
    let lastCumulativeProtocolSideRevenueUSD = BIGDECIMAL_ZERO;
    let lastCumulativeTotalRevenueUSD = BIGDECIMAL_ZERO;
    const previous = snapshot._previous;
    if (previous) {
      const prev = VaultHourlySnapshot.load(previous)!;
      lastCumulativeSupplySideRevenueUSD = prev.cumulativeSupplySideRevenueUSD;
      lastCumulativeProtocolSideRevenueUSD =
        prev.cumulativeProtocolSideRevenueUSD;
      lastCumulativeTotalRevenueUSD = prev.cumulativeTotalRevenueUSD;
    }

    snapshot.hourlySupplySideRevenueUSD =
      snapshot.cumulativeSupplySideRevenueUSD.minus(
        lastCumulativeSupplySideRevenueUSD
      );
    snapshot.hourlyProtocolSideRevenueUSD =
      snapshot.cumulativeProtocolSideRevenueUSD.minus(
        lastCumulativeProtocolSideRevenueUSD
      );
    snapshot.hourlyTotalRevenueUSD = snapshot.cumulativeTotalRevenueUSD.minus(
      lastCumulativeTotalRevenueUSD
    );
    snapshot.save();
  }
}
