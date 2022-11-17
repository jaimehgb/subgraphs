// import {
//   TransmuterActiveVaultUpdated as TransmuterActiveVaultUpdatedEvent,
//   TransmuterCollateralizationLimitUpdated as TransmuterCollateralizationLimitUpdatedEvent,
//   TransmuterEmergencyExitUpdated as TransmuterEmergencyExitUpdatedEvent,
//   TransmuterFundsFlushed as TransmuterFundsFlushedEvent,
//   TransmuterFundsHarvested as TransmuterFundsHarvestedEvent,
//   TransmuterFundsRecalled as TransmuterFundsRecalledEvent,
//   TransmuterGovernanceUpdated as TransmuterGovernanceUpdatedEvent,
//   TransmuterHarvestFeeUpdated as TransmuterHarvestFeeUpdatedEvent,
//   TransmuterPendingGovernanceUpdated as TransmuterPendingGovernanceUpdatedEvent,
//   TransmuterRewardsUpdated as TransmuterRewardsUpdatedEvent,
//   TransmuterSentinelUpdated as TransmuterSentinelUpdatedEvent,
//   TransmuterTokensDeposited as TransmuterTokensDepositedEvent,
//   TransmuterTokensLiquidated as TransmuterTokensLiquidatedEvent,
//   TransmuterTokensRepaid as TransmuterTokensRepaidEvent,
//   TransmuterTokensWithdrawn as TransmuterTokensWithdrawnEvent,
//   TransmuterTransmuterUpdated as TransmuterTransmuterUpdatedEvent,
// } from "../generated/Transmuter/Transmuter";
// import {
//   TransmuterActiveVaultUpdated,
//   TransmuterCollateralizationLimitUpdated,
//   TransmuterEmergencyExitUpdated,
//   TransmuterFundsFlushed,
//   TransmuterFundsHarvested,
//   TransmuterFundsRecalled,
//   TransmuterGovernanceUpdated,
//   TransmuterHarvestFeeUpdated,
//   TransmuterPendingGovernanceUpdated,
//   TransmuterRewardsUpdated,
//   TransmuterSentinelUpdated,
//   TransmuterTokensDeposited,
//   TransmuterTokensLiquidated,
//   TransmuterTokensRepaid,
//   TransmuterTokensWithdrawn,
//   TransmuterTransmuterUpdated,
// } from "../generated/schema";

// export function handleTransmuterActiveVaultUpdated(
//   event: TransmuterActiveVaultUpdatedEvent
// ): void {
//   let entity = new TransmuterActiveVaultUpdated(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   );
//   entity.adapter = event.params.adapter;
//   entity.save();
// }

// export function handleTransmuterCollateralizationLimitUpdated(
//   event: TransmuterCollateralizationLimitUpdatedEvent
// ): void {
//   let entity = new TransmuterCollateralizationLimitUpdated(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   );
//   entity.limit = event.params.limit;
//   entity.save();
// }

// export function handleTransmuterEmergencyExitUpdated(
//   event: TransmuterEmergencyExitUpdatedEvent
// ): void {
//   let entity = new TransmuterEmergencyExitUpdated(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   );
//   entity.status = event.params.status;
//   entity.save();
// }

// export function handleTransmuterFundsFlushed(
//   event: TransmuterFundsFlushedEvent
// ): void {
//   let entity = new TransmuterFundsFlushed(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   );
//   entity.amount = event.params.amount;
//   entity.save();
// }

// export function handleTransmuterFundsHarvested(
//   event: TransmuterFundsHarvestedEvent
// ): void {
//   let entity = new TransmuterFundsHarvested(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   );
//   entity.withdrawnAmount = event.params.withdrawnAmount;
//   entity.decreasedValue = event.params.decreasedValue;
//   entity.save();
// }

// export function handleTransmuterFundsRecalled(
//   event: TransmuterFundsRecalledEvent
// ): void {
//   let entity = new TransmuterFundsRecalled(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   );
//   entity.vaultId = event.params.vaultId;
//   entity.withdrawnAmount = event.params.withdrawnAmount;
//   entity.decreasedValue = event.params.decreasedValue;
//   entity.save();
// }

// export function handleTransmuterGovernanceUpdated(
//   event: TransmuterGovernanceUpdatedEvent
// ): void {
//   let entity = new TransmuterGovernanceUpdated(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   );
//   entity.governance = event.params.governance;
//   entity.save();
// }

// export function handleTransmuterHarvestFeeUpdated(
//   event: TransmuterHarvestFeeUpdatedEvent
// ): void {
//   let entity = new TransmuterHarvestFeeUpdated(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   );
//   entity.fee = event.params.fee;
//   entity.save();
// }

// export function handleTransmuterPendingGovernanceUpdated(
//   event: TransmuterPendingGovernanceUpdatedEvent
// ): void {
//   let entity = new TransmuterPendingGovernanceUpdated(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   );
//   entity.pendingGovernance = event.params.pendingGovernance;
//   entity.save();
// }

// export function handleTransmuterRewardsUpdated(
//   event: TransmuterRewardsUpdatedEvent
// ): void {
//   let entity = new TransmuterRewardsUpdated(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   );
//   entity.treasury = event.params.treasury;
//   entity.save();
// }

// export function handleTransmuterSentinelUpdated(
//   event: TransmuterSentinelUpdatedEvent
// ): void {
//   let entity = new TransmuterSentinelUpdated(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   );
//   entity.sentinel = event.params.sentinel;
//   entity.save();
// }

// export function handleTransmuterTokensDeposited(
//   event: TransmuterTokensDepositedEvent
// ): void {
//   let entity = new TransmuterTokensDeposited(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   );
//   entity.account = event.params.account;
//   entity.amount = event.params.amount;
//   entity.save();
// }

// export function handleTransmuterTokensLiquidated(
//   event: TransmuterTokensLiquidatedEvent
// ): void {
//   let entity = new TransmuterTokensLiquidated(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   );
//   entity.account = event.params.account;
//   entity.requestedAmount = event.params.requestedAmount;
//   entity.withdrawnAmount = event.params.withdrawnAmount;
//   entity.decreasedValue = event.params.decreasedValue;
//   entity.save();
// }

// export function handleTransmuterTokensRepaid(
//   event: TransmuterTokensRepaidEvent
// ): void {
//   let entity = new TransmuterTokensRepaid(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   );
//   entity.account = event.params.account;
//   entity.parentAmount = event.params.parentAmount;
//   entity.childAmount = event.params.childAmount;
//   entity.save();
// }

// export function handleTransmuterTokensWithdrawn(
//   event: TransmuterTokensWithdrawnEvent
// ): void {
//   let entity = new TransmuterTokensWithdrawn(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   );
//   entity.account = event.params.account;
//   entity.requestedAmount = event.params.requestedAmount;
//   entity.withdrawnAmount = event.params.withdrawnAmount;
//   entity.decreasedValue = event.params.decreasedValue;
//   entity.save();
// }

// export function handleTransmuterTransmuterUpdated(
//   event: TransmuterTransmuterUpdatedEvent
// ): void {
//   let entity = new TransmuterTransmuterUpdated(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   );
//   entity.transmuter = event.params.transmuter;
//   entity.save();
// }
