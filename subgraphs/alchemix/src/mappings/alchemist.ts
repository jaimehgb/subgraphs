import { Address, BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
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
  BIGDECIMAL_ONE,
} from "../sdk/util/constants";
import { YieldAggregator, Vault } from "../sdk/protocols/yield";
import { TokenPricer } from "../sdk/protocols/config";

class Pricer implements TokenPricer {
  getTokenPrice(token: Token): BigDecimal {
    return BIGDECIMAL_ONE;
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
    // todo see how we handle these
    return;
  }

  const vault = protocol.loadVault(
    event.params.adapter.toHexString(),
    onCreateVault
  );
  refreshVaultTVL(vault);
}

export function handleFundsFlushed(event: FundsFlushed): void {
  const protocol = YieldAggregator.load(protocolConfig, new Pricer(), event);
  const vault = getAlchemistCurrentVault(protocol, event.address)!;
  vault.addInputTokenBalance(event.params.amount);
  refreshVaultTVL(vault);
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
  const net = amountUSD.minus(feeAmountUSD);

  // alchemix sends funds harvested to transmuter contract, they don't stay in the vault
  // this is why we don't need to update the vault balance nor TVL; and update the protocol's tvl directly instead.
  // Also, we deduct the fee from the TVL because it goes to rewards, doesn't stay in the protocol.
  vault.addProtocolSideRevenueUSD(feeAmountUSD);
  vault.addSupplySideRevenueUSD(net);
  protocol.addTotalValueLocked(net);
  refreshVaultTVL(vault);
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
  refreshVaultTVL(vault);
}

export function handleTokensWithdrawn(event: TokensWithdrawn): void {
  const protocol = YieldAggregator.load(protocolConfig, new Pricer(), event);
  const vault = getAlchemistCurrentVault(protocol, event.address)!;

  const amounts = getWithdrawAmounts(event, vault);
  const withdraw = vault.withdraw(
    event,
    event.params.account,
    amounts.totalWithdrawn,
    false // do not update metrics automatically since deposits/withdrawals are buffered
  );
  vault.addInputTokenBalance(
    amounts.withdrawnFromVault.times(BIGINT_MINUS_ONE)
  );
  protocol.addTotalValueLocked(withdraw.amountUSD.times(BIGDECIMAL_MINUS_ONE));
}

class WithdrawAmounts {
  withdrawnFromBuffer: BigInt;
  withdrawnFromVault: BigInt;
  totalWithdrawn: BigInt;
}

// When withdrawing from alchemix, it is possible for some funds to come directly from the underlying
// vault and others to come from a buffer living in the alchemist contract. This function returns
// the amounts of each by inspecting at the transaction logs, attempting to find an ERC20 Transfer
// event from vault.inputToken having the alchemist contract as the sender.
function getWithdrawAmounts(
  event: TokensWithdrawn,
  vault: Vault
): WithdrawAmounts {
  const alchemistAddress = event.address;
  for (let i = 0; i < event.receipt!.logs.length; i++) {
    const log = event.receipt!.logs[i];
    if (!log) {
      continue;
    }
    if (log.address.toHexString() != vault.vault.inputToken) {
      continue;
    }
    const transfer = transferEventFromLog(log);
    if (!transfer) {
      continue;
    }

    if (transfer.from.equals(alchemistAddress)) {
      // funds sent from alchemist to user, these were buffered
      const buffered = transfer.amount;
      const withdrawnFromVault = event.params.withdrawnAmount.minus(buffered);
      return {
        withdrawnFromBuffer: buffered,
        withdrawnFromVault: withdrawnFromVault,
        totalWithdrawn: event.params.withdrawnAmount,
      };
    }
  }

  return {
    withdrawnFromBuffer: BIGINT_ZERO,
    withdrawnFromVault: event.params.withdrawnAmount,
    totalWithdrawn: event.params.withdrawnAmount,
  };
}

class ERC20Transfer {
  from: Address;
  to: Address;
  amount: BigInt;
}

function transferEventFromLog(log: ethereum.Log): ERC20Transfer | null {
  const ERC20TransferTopic0 =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  if (log.topics[0].toHexString() != ERC20TransferTopic0) {
    return null;
  }
  const from = Address.fromBytes(log.topics[1]);
  const to = Address.fromBytes(log.topics[2]);
  const amount = BigInt.fromByteArray(log.data);
  return {
    from,
    to,
    amount,
  };
}

export function handleTokensLiquidated(event: TokensLiquidated): void {
  const protocol = YieldAggregator.load(protocolConfig, new Pricer(), event);
  // doesnt do anything because no funds enter or leave the protocol.
  // maybe create some event to track it?
}

export function handleTokensRepaid(event: TokensRepaid): void {
  const protocol = YieldAggregator.load(protocolConfig, new Pricer(), event);
  // users can repay with both synthetic or native token. If repaid with native, we
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

function refreshVaultTVL(vault: Vault): void {
  const vaultSC = YearnVaultAdapter.bind(Address.fromString(vault.vault.id));
  const balance = vaultSC.totalValue();
  vault.setInputTokenBalance(balance);
}
