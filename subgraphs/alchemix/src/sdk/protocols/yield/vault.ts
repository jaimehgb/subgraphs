// graph dependencies
import { ethereum, Address, BigInt, BigDecimal } from "@graphprotocol/graph-ts";

// schema dependencies
import {
  Vault as VaultSchema,
  VaultFee,
  Deposit,
  Token,
  Withdraw,
} from "../../../../generated/schema";

// lib dependencies
import { exponentToBigDecimal } from "../../util/numbers";
import * as constants from "../../util/constants";
import { Tokens } from "../../common/tokens";
import { YieldAggregatorProtocol } from "./protocol";

// Vault is a wrapper around out Vault entity. Managing Vault entities with this
// is preferred since it will automatically update snapshots and aggregate values dependant
// on it (like protocol tvl, revenue, etc).
export class Vault {
  vault: VaultSchema;
  protocol: YieldAggregatorProtocol;

  private constructor(vault: VaultSchema, protocol: YieldAggregatorProtocol) {
    this.vault = vault;
    this.protocol = protocol;
  }

  static load(
    id: string,
    protocol: YieldAggregatorProtocol,
    onCreate: ((vault: Vault, event: ethereum.Event) => void) | null = null
  ): Vault {
    let vault = VaultSchema.load(id);
    if (vault) {
      return new Vault(vault, protocol);
    }

    vault = new VaultSchema(id);
    vault.protocol = protocol.getID();

    const vaultWrapper = new Vault(vault, protocol);
    if (onCreate) {
      onCreate(vaultWrapper, protocol.getCurrentEvent());
    }

    protocol.addVault(1);
    return vaultWrapper;
  }

  private save(): void {
    this.updateSnapshots();
    this.vault.save();
  }

  private updateSnapshots(): void {
    // todo
  }

  initialize(
    name: string,
    symbol: string,
    depositLimit: BigInt,
    inputToken: Address,
    outputToken: Address | null
  ): void {
    this.vault.name = name;
    this.vault.symbol = symbol;
    this.vault.depositLimit = depositLimit;
    this.vault.inputToken = inputToken.toHexString();
    this.vault.outputToken = outputToken ? outputToken.toHexString() : null;
    this.vault.createdTimestamp =
      this.protocol.getCurrentEvent().block.timestamp;
    this.vault.createdBlockNumber =
      this.protocol.getCurrentEvent().block.number;

    // defaults
    this.vault.totalValueLockedUSD = constants.BIGDECIMAL_ZERO;
    this.vault.cumulativeSupplySideRevenueUSD = constants.BIGDECIMAL_ZERO;
    this.vault.cumulativeProtocolSideRevenueUSD = constants.BIGDECIMAL_ZERO;
    this.vault.cumulativeTotalRevenueUSD = constants.BIGDECIMAL_ZERO;
    this.vault.inputTokenBalance = constants.BIGINT_ZERO;
    this.vault.rewardTokenEmissionsAmount = [];
    this.vault.rewardTokenEmissionsUSD = [];
    this.vault.rewardTokens = [];
    this.vault.fees = [];
    this.save();

    Tokens.initToken(inputToken);
    if (outputToken) {
      Tokens.initToken(outputToken);
    }
  }

  private getInputToken(): Token {
    return Token.load(this.vault.inputToken)!;
  }

  getInputTokenAmountPrice(amount: BigInt): BigDecimal {
    const token = this.getInputToken();
    const price = this.protocol.getTokenPricer().getTokenPrice(token);
    token.lastPriceUSD = price;
    token.save();

    return amount.divDecimal(exponentToBigDecimal(token.decimals)).times(price);
  }

  addInputTokenBalance(amount: BigInt): void {
    const newBalance = this.vault.inputTokenBalance.plus(amount);
    this.setInputTokenBalance(newBalance);
  }

  setInputTokenBalance(newBalance: BigInt): void {
    this.vault.inputTokenBalance = newBalance;
    this.refreshTotalValueLocked();
  }

  refreshTotalValueLocked(): void {
    const tvl = this.getInputTokenAmountPrice(this.vault.inputTokenBalance);
    this.setTotalValueLocked(tvl);
  }

  setTotalValueLocked(newTVL: BigDecimal): void {
    const delta = newTVL.minus(this.vault.totalValueLockedUSD);
    this.addTotalValueLocked(delta);
    this.save();
  }

  addTotalValueLocked(delta: BigDecimal): void {
    this.vault.totalValueLockedUSD = this.vault.totalValueLockedUSD.plus(delta);
    this.protocol.addTotalValueLocked(delta);
    this.save();
  }

  addSupplySideRevenueUSD(rev: BigDecimal): void {
    this.vault.cumulativeTotalRevenueUSD =
      this.vault.cumulativeTotalRevenueUSD.plus(rev);
    this.vault.cumulativeSupplySideRevenueUSD =
      this.vault.cumulativeSupplySideRevenueUSD.plus(rev);
    this.save();
  }

  addProtocolSideRevenueUSD(rev: BigDecimal): void {
    this.vault.cumulativeTotalRevenueUSD =
      this.vault.cumulativeTotalRevenueUSD.plus(rev);
    this.vault.cumulativeProtocolSideRevenueUSD =
      this.vault.cumulativeProtocolSideRevenueUSD.plus(rev);
    this.save();
  }

  addRevenueUSD(protocolSide: BigDecimal, supplySide: BigDecimal): void {
    this.addSupplySideRevenueUSD(supplySide);
    this.addProtocolSideRevenueUSD(protocolSide);
  }

  setRewardToken(
    token: string,
    emissions: BigInt,
    emissionsUSD: BigDecimal
  ): void {
    // todo
    // Tokens.initToken(token);
  }

  removeRewardToken(token: string): void {
    // todo
  }

  setDepositLimit(limit: BigInt): void {
    this.vault.depositLimit = limit;
    this.save();
  }

  setFee(type: string, percentage: BigDecimal): void {
    const id = `${type}-${this.vault.id}`;
    let fee = VaultFee.load(id);
    if (!fee) {
      fee = new VaultFee(id);
      fee.feeType = type;
    }

    fee.feePercentage = percentage;
    fee.save();

    if (!this.vault.fees.includes(id)) {
      const fees = this.vault.fees;
      fees.push(fee.id);
      this.vault.fees = fees;
    }

    this.save();
  }

  getFees(): VaultFee[] {
    const fees = new Array<VaultFee>();
    for (let i = 0; i < this.vault.fees.length; i++) {
      const fee = VaultFee.load(this.vault.fees[i]);
      if (fee) {
        fees.push(fee);
      }
    }
    return fees;
  }

  deposit(
    event: ethereum.Event,
    account: Address,
    amount: BigInt,
    updateMetrics: boolean = true
  ): Deposit {
    this.protocol.storeAccount(account);

    const id = `${event.transaction.hash.toHexString()}-${event.logIndex}`;
    const deposit = new Deposit(id);
    copyEventDataToDeposit(event, deposit);
    deposit.protocol = this.protocol.getID();
    deposit.amount = amount;
    deposit.amountUSD = this.getInputTokenAmountPrice(amount);
    deposit.asset = this.vault.inputToken;
    deposit.vault = this.vault.id;
    deposit.from = account.toHexString();
    deposit.to = this.vault.id;
    deposit.entries;
    deposit.save();

    if (!updateMetrics) {
      return deposit;
    }

    this.addInputTokenBalance(amount);
    // todo collect deposit feee
    return deposit;
  }

  withdraw(
    event: ethereum.Event,
    account: Address,
    amount: BigInt,
    updateMetrics: boolean = true
  ): Withdraw {
    this.protocol.storeAccount(account);

    const id = `${event.transaction.hash.toHexString()}-${event.logIndex}`;
    const withdraw = new Withdraw(id);
    copyEventDataToWithdraw(event, withdraw);
    withdraw.protocol = this.protocol.getID();
    withdraw.amount = amount;
    withdraw.amountUSD = this.getInputTokenAmountPrice(amount);
    withdraw.asset = this.vault.inputToken;
    withdraw.vault = this.vault.id;
    withdraw.from = this.vault.id;
    withdraw.to = account.toHexString();
    withdraw.save();

    if (!updateMetrics) {
      return withdraw;
    }

    this.addInputTokenBalance(amount.times(constants.BIGINT_MINUS_ONE));
    // todo collect withdrawal feee
    return withdraw;
  }
}

function copyEventDataToDeposit(
  event: ethereum.Event,
  deposit: Deposit
): Deposit {
  deposit.hash = event.transaction.hash.toHexString();
  deposit.logIndex = event.logIndex.toI32();
  deposit.blockNumber = event.block.number;
  deposit.timestamp = event.block.timestamp;
  return deposit;
}

function copyEventDataToWithdraw(
  event: ethereum.Event,
  withdraw: Withdraw
): Withdraw {
  withdraw.hash = event.transaction.hash.toHexString();
  withdraw.logIndex = event.logIndex.toI32();
  withdraw.blockNumber = event.block.number;
  withdraw.timestamp = event.block.timestamp;
  return withdraw;
}
