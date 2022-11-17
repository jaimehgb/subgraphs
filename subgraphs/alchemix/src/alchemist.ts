// import { BigDecimal, BigInt, Address } from "@graphprotocol/graph-ts";
// import {
//   Alchemist,
//   ActiveVaultUpdated,
//   CollateralizationLimitUpdated,
//   EmergencyExitUpdated,
//   FundsFlushed,
//   FundsHarvested,
//   FundsRecalled,
//   GovernanceUpdated,
//   HarvestFeeUpdated,
//   PendingGovernanceUpdated,
//   RewardsUpdated,
//   SentinelUpdated,
//   TokensDeposited,
//   TokensLiquidated,
//   TokensRepaid,
//   TokensWithdrawn,
//   TransmuterUpdated,
// } from "../generated/Alchemist/Alchemist";
// import { YearnVaultAdapter } from "../generated/templates/VaultAdapter/YearnVaultAdapter";
// import { ERC20 } from "../generated/templates/VaultAdapter/ERC20";
// import { Token, Vault, VaultFee, YieldAggregator } from "../generated/schema";
// import {
//   VaultFeeType,
//   ALCHEMIX_DEPLOYER,
//   PROTOCOL_SCHEMA_VERSION,
//   PROTOCOL_SUBGRAPH_VERSION,
//   PROTOCOL_METHODOLOGY_VERSION,
//   PROTOCOL_SLUG,
//   PROTOCOL_NAME,
//   PROTOCOL_NETWORK,
//   PROTOCOL_TYPE,
//   BIGDECIMAL_ZERO,
//   BIGINT_ZERO,
// } from "./common/constants";

// function initProtocol(): YieldAggregator {
//   let protocol = YieldAggregator.load(ALCHEMIX_DEPLOYER);
//   if (protocol) {
//     return protocol;
//   }

//   protocol = new YieldAggregator(ALCHEMIX_DEPLOYER);
//   protocol.name = PROTOCOL_NAME;
//   protocol.slug = PROTOCOL_SLUG;
//   protocol.schemaVersion = PROTOCOL_SCHEMA_VERSION;
//   protocol.subgraphVersion = PROTOCOL_SUBGRAPH_VERSION;
//   protocol.methodologyVersion = PROTOCOL_METHODOLOGY_VERSION;
//   protocol.network = PROTOCOL_NETWORK;
//   protocol.type = PROTOCOL_TYPE;
//   protocol.totalValueLockedUSD = BIGDECIMAL_ZERO;
//   protocol.protocolControlledValueUSD = BIGDECIMAL_ZERO;
//   protocol.cumulativeSupplySideRevenueUSD = BIGDECIMAL_ZERO;
//   protocol.cumulativeProtocolSideRevenueUSD = BIGDECIMAL_ZERO;
//   protocol.cumulativeTotalRevenueUSD = BIGDECIMAL_ZERO;
//   protocol.cumulativeUniqueUsers = 0;
//   protocol.totalPoolCount = 0;

//   protocol.save();
//   return protocol;
// }

// function initToken(address: Address): Token {
//   let token = Token.load(address.toHexString());
//   if (token) {
//     return token;
//   }

//   let sc = ERC20.bind(address);
//   token = new Token(address.toHexString());
//   token.name = sc.name();
//   token.symbol = sc.symbol();
//   token.decimals = sc.decimals();
//   token.lastPriceUSD = BIGDECIMAL_ZERO; // todo
//   token.lastPriceBlockNumber = BIGINT_ZERO;

//   token.save();
//   return token;
// }

// function initVault(event: ActiveVaultUpdated): Vault {
//   let protocol = initProtocol();

//   let vaultAddress = event.params.adapter.toHexString();
//   let v = Vault.load(vaultAddress);
//   if (v) {
//     return v;
//   }

//   let alchemist = Alchemist.bind(event.address);

//   let resolution = alchemist.PERCENT_RESOLUTION().toBigDecimal();
//   let feeVal = alchemist.harvestFee().toBigDecimal();

//   let feeID = `${VaultFeeType.PERFORMANCE_FEE}-${event.address.toHexString()}`;
//   let fee = new VaultFee(feeID);
//   fee.feePercentage = feeVal.div(resolution);
//   fee.feeType = VaultFeeType.PERFORMANCE_FEE;

//   let vaultSC = YearnVaultAdapter.bind(event.address);
//   let depositToken = vaultSC.token();
//   let yieldToken = vaultSC.vault();

//   let depositTokenSC = ERC20.bind(depositToken);
//   let yieldTokenSC = ERC20.bind(yieldToken);

//   let vault = new Vault(event.address.toHexString());
//   vault.protocol = protocol.id;
//   vault.name = `Alchemix V1 ${yieldTokenSC.name()}`;
//   vault.symbol = yieldTokenSC.symbol();

//   vault.inputToken = initToken(depositToken).id;
//   vault.depositLimit = BIGINT_ZERO;
//   vault.fees = [fee.id];
//   vault.createdTimestamp = event.block.timestamp;
//   vault.createdBlockNumber = event.block.number;
//   vault.totalValueLockedUSD = BIGDECIMAL_ZERO;
//   vault.cumulativeSupplySideRevenueUSD = BIGDECIMAL_ZERO;
//   vault.cumulativeProtocolSideRevenueUSD = BIGDECIMAL_ZERO;
//   vault.cumulativeTotalRevenueUSD = BIGDECIMAL_ZERO;
//   vault.inputTokenBalance = BIGINT_ZERO;
//   vault.outputTokenSupply = BIGINT_ZERO;
//   vault.outputTokenPriceUSD = BIGDECIMAL_ZERO;
//   // vault.pricePerShare

//   fee.save();
//   vault.save();

//   return vault;
// }

// export function handleActiveVaultUpdated(event: ActiveVaultUpdated): void {
//   let vault = initVault(event);
// }

// export function handleEmergencyExitUpdated(event: EmergencyExitUpdated): void {}

// export function handleFundsFlushed(event: FundsFlushed): void {
//   // update vault tvl
// }

// export function handleFundsHarvested(event: FundsHarvested): void {
//   // update financials?
//   // update fees
// }

// export function handleFundsRecalled(event: FundsRecalled): void {
//   // think about this. update tvl from vault?
// }

// export function handleHarvestFeeUpdated(event: HarvestFeeUpdated): void {
//   // update fee on all vaults from this alchemist
// }

// export function handleRewardsUpdated(event: RewardsUpdated): void {}

// export function handleTokensDeposited(event: TokensDeposited): void {
//   // add deposit, add account, update tvl
// }

// export function handleTokensLiquidated(event: TokensLiquidated): void {
//   // doesnt do anything because no funds enter or leave the protocol.
//   // maybe create some event to track it?
// }

// export function handleTokensRepaid(event: TokensRepaid): void {
//   // if token is not the synthetic, then add to tvl (as a deposit?)
// }

// export function handleTokensWithdrawn(event: TokensWithdrawn): void {
//   // add withdrawal, add account, update tvl
// }

// export function handleTransmuterUpdated(event: TransmuterUpdated): void {}
