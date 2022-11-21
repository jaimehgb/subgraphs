import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import {
  Alchemist,
  ActiveVaultUpdated,
  FundsFlushed,
  FundsHarvested,
  FundsRecalled,
  HarvestFeeUpdated,
  RewardsUpdated,
  TokensDeposited,
  TokensLiquidated,
  TokensRepaid,
  TokensWithdrawn,
  TransmuterUpdated,
} from "../../generated/Alchemist/Alchemist";
import { YearnVault } from "../../generated/Alchemist/YearnVault";
import { YearnVaultAdapter } from "../../generated/templates/VaultAdapter/YearnVaultAdapter";
import { protocolConfig } from "../common/constants";
import { Token } from "../../generated/schema";
import { getAlchemistCurrentVault, setAlchemistVault } from "../storage/aux";

// std lib imports
import {
  BIGDECIMAL_HUNDRED,
  BIGDECIMAL_ZERO,
  BIGINT_MINUS_ONE,
  BIGDECIMAL_MINUS_ONE,
  BIGINT_ZERO,
  VaultFeeType,
  BIGINT_HUNDRED,
} from "../sdk/util/constants";
import { YieldAggregator, Vault } from "../sdk/protocols/yield";
import { TokenPricer } from "../sdk/protocols/config";

class Pricer implements TokenPricer {
  getTokenPrice(token: Token): BigDecimal {
    return BIGDECIMAL_ZERO;
  }
}

export function handleActiveVaultUpdated(event: ActiveVaultUpdated): void {
  const pricer = new Pricer();
  const protocol = YieldAggregator.load(protocolConfig, pricer, event);
  if (
    [
      "0x72A7cb4d5daB8E9Ba23f30DBE8E72Bc854a9945A".toLowerCase(),
      "0xb4e7cc74e004f95aee7565a97dbfdea9c1761b24".toLowerCase(),
    ].includes(event.params.adapter.toHexString())
  ) {
    return;
  }

  protocol.loadVault(event.params.adapter.toHexString(), onCreateVault);
}

export function handleFundsFlushed(event: FundsFlushed): void {
  const protocol = YieldAggregator.load(protocolConfig, new Pricer(), event);
  const vault = getAlchemistCurrentVault(protocol, event.address)!;
  vault.addInputTokenBalance(event.params.amount);
}

export function handleFundsRecalled(event: FundsRecalled): void {
  const protocol = YieldAggregator.load(protocolConfig, new Pricer(), event);
  const alchemist = Alchemist.bind(event.address);
  const vaultID = event.params.vaultId;
  const vaultAddr = alchemist.getVaultAdapter(vaultID);

  const vault = protocol.loadVault(vaultAddr.toHexString());
  vault.addInputTokenBalance(
    event.params.withdrawnAmount.times(BIGINT_MINUS_ONE)
  );
}

export function handleFundsHarvested(event: FundsHarvested): void {
  const protocol = YieldAggregator.load(protocolConfig, new Pricer(), event);
  const vault = getAlchemistCurrentVault(protocol, event.address)!;
  const fee = vault.getFees()[0];

  const amountUSD = vault.getInputTokenAmountPrice(
    event.params.withdrawnAmount
  );
  const feeAmountUSD = amountUSD
    .times(fee.feePercentage!)
    .div(BIGDECIMAL_HUNDRED);

  // alchemix sends funds harvested to transmuter contract, they don't stay in the vault
  // this is why we don't need to update the vault balance, and update the protocol tvl directly.
  // Also, we deduct the fee from the TVL because it goes to rewards, doesn't stay in the protocol.
  protocol.addTotalValueLocked(amountUSD.minus(feeAmountUSD));
  vault.addProtocolSideRevenueUSD(feeAmountUSD);
}

export function handleHarvestFeeUpdated(event: HarvestFeeUpdated): void {
  const protocol = YieldAggregator.load(protocolConfig, new Pricer(), event);
  const alchemist = Alchemist.bind(event.address);

  // the fee is taken at the alchemist level, so it applies to all the vaults managed by it.
  const resolution = alchemist.PERCENT_RESOLUTION().toBigDecimal();
  const feeVal = event.params.fee;
  const feePercentage = feeVal.times(BIGINT_HUNDRED).divDecimal(resolution);

  const currentVaultIndex = alchemist.vaultCount().toI32();
  for (let i = 0; i < currentVaultIndex; i++) {
    const vaultAddr = alchemist.getVaultAdapter(BigInt.fromI32(i));
    const vault = protocol.loadVault(vaultAddr.toHexString());
    vault.setFee(VaultFeeType.PERFORMANCE_FEE, feePercentage);
  }
}

export function handleRewardsUpdated(event: RewardsUpdated): void {
  const protocol = YieldAggregator.load(protocolConfig, new Pricer(), event);
  // todo
}

export function handleTokensDeposited(event: TokensDeposited): void {
  const protocol = YieldAggregator.load(protocolConfig, new Pricer(), event);
  const vault = getAlchemistCurrentVault(protocol, event.address)!;
  const deposit = vault.deposit(
    event,
    event.params.account,
    event.params.amount,
    false // do not update metrics automatically since deposits/withdrawals are buffered
  );

  protocol.addTotalValueLocked(deposit.amountUSD);
}

export function handleTokensWithdrawn(event: TokensWithdrawn): void {
  const protocol = YieldAggregator.load(protocolConfig, new Pricer(), event);
  const vault = getAlchemistCurrentVault(protocol, event.address)!;
  const withdraw = vault.withdraw(
    event,
    event.params.account,
    event.params.withdrawnAmount,
    false // do not update metrics automatically since deposits/withdrawals are buffered
  );

  // todo reduce vault balance if buffer was not enough
  protocol.addTotalValueLocked(withdraw.amountUSD.times(BIGDECIMAL_MINUS_ONE));
}

export function handleTokensLiquidated(event: TokensLiquidated): void {
  const protocol = YieldAggregator.load(protocolConfig, new Pricer(), event);
  // doesnt do anything because no funds enter or leave the protocol.
  // maybe create some event to track it?
}

export function handleTokensRepaid(event: TokensRepaid): void {
  const protocol = YieldAggregator.load(protocolConfig, new Pricer(), event);
  // if token is not the synthetic, then add to tvl (as a deposit?)
}

export function handleTransmuterUpdated(event: TransmuterUpdated): void {
  const protocol = YieldAggregator.load(protocolConfig, new Pricer(), event);
  // todo
}

function onCreateVault(wrapper: Vault, event: TokensDeposited): void {
  const alchemist = Alchemist.bind(event.address);

  // calculate fee
  const resolution = alchemist.PERCENT_RESOLUTION().toBigDecimal();
  const feeVal = alchemist.harvestFee();
  const feePercentage = feeVal.times(BIGINT_HUNDRED).divDecimal(resolution);

  // get token and vault name and symbol
  const vaultSC = YearnVaultAdapter.bind(Address.fromString(wrapper.vault.id));
  const depositToken = vaultSC.token();
  const yieldToken = vaultSC.vault();
  const yieldTokenSC = YearnVault.bind(yieldToken);
  const name = `Alchemix V1 ${yieldTokenSC.name()} ${yieldTokenSC.apiVersion()}`;
  const symbol = yieldTokenSC.symbol();
  const limit = BIGINT_ZERO;

  wrapper.initialize(name, symbol, limit, depositToken, yieldToken);
  wrapper.setFee(VaultFeeType.PERFORMANCE_FEE, feePercentage);

  setAlchemistVault(event.address, Address.fromString(wrapper.vault.id));
}
