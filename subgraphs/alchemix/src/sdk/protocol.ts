import {
  BigDecimal,
  BigInt,
  Address,
  dataSource,
  ethereum,
} from "@graphprotocol/graph-ts";
import { Versions } from "../../../../deployment/context/interface";
import {
  YieldAggregator as YieldAggregatorSchema,
  Vault as VaultSchema,
  VaultFee,
  Deposit,
  Account,
} from "../../generated/schema";
import * as constants from "./constants";

export class ProtocolConfig {
  id: string;
  name: string;
  slug: string;
  versions: Versions;

  constructor(id: string, name: string, slug: string, versions: Versions) {
    this.id = id;
    this.name = name;
    this.slug = slug;
    this.versions = versions;
  }
}

// YieldAggregator is a wrapper around our YieldAggregator entity. It exposes
// additional functionality to load the entity, keep versions updated, take snapshots
// and safely modify values.
export class YieldAggregator {
  protocol: YieldAggregatorSchema;
  event: ethereum.Event;

  private constructor(protocol: YieldAggregatorSchema, event: ethereum.Event) {
    this.protocol = protocol;
    this.event = event;
  }

  static load(conf: ProtocolConfig, event: ethereum.Event): YieldAggregator {
    let protocol = YieldAggregatorSchema.load(conf.id);
    if (protocol) {
      const proto = new YieldAggregator(protocol, event);
      proto.setVersions(conf.versions);
      return proto;
    }

    protocol = new YieldAggregatorSchema(conf.id);
    protocol.name = conf.name;
    protocol.slug = conf.slug;
    protocol.network = dataSource.network().toUpperCase();
    protocol.type = constants.ProtocolType.YIELD;
    protocol.totalValueLockedUSD = constants.BIGDECIMAL_ZERO;
    protocol.protocolControlledValueUSD = constants.BIGDECIMAL_ZERO;
    protocol.cumulativeSupplySideRevenueUSD = constants.BIGDECIMAL_ZERO;
    protocol.cumulativeProtocolSideRevenueUSD = constants.BIGDECIMAL_ZERO;
    protocol.cumulativeTotalRevenueUSD = constants.BIGDECIMAL_ZERO;
    protocol.cumulativeUniqueUsers = 0;
    protocol.totalPoolCount = 0;

    const proto = new YieldAggregator(protocol, event);
    proto.setVersions(conf.versions);
    return proto;
  }

  private setVersions(versions: Versions): void {
    this.protocol.schemaVersion = versions.getSchemaVersion();
    this.protocol.subgraphVersion = versions.getSubgraphVersion();
    this.protocol.methodologyVersion = versions.getMethodologyVersion();
    this.protocol.save();
  }

  private save(): void {
    this.updateSnapshots();
    this.protocol.save();
  }

  private updateSnapshots(): void {
    // todo
  }

  getID(): string {
    return this.protocol.id;
  }

  currentEvent(): ethereum.Event {
    return this.event;
  }

  addSupplySideRevenueUSD(rev: BigDecimal): void {
    this.protocol.cumulativeTotalRevenueUSD =
      this.protocol.cumulativeTotalRevenueUSD.plus(rev);
    this.protocol.cumulativeSupplySideRevenueUSD =
      this.protocol.cumulativeSupplySideRevenueUSD.plus(rev);
    this.save();
  }

  addProtocolSideRevenueUSD(rev: BigDecimal): void {
    this.protocol.cumulativeTotalRevenueUSD =
      this.protocol.cumulativeTotalRevenueUSD.plus(rev);
    this.protocol.cumulativeProtocolSideRevenueUSD =
      this.protocol.cumulativeProtocolSideRevenueUSD.plus(rev);
    this.save();
  }

  addRevenueUSD(protocolSide: BigDecimal, supplySide: BigDecimal): void {
    this.addSupplySideRevenueUSD(supplySide);
    this.addProtocolSideRevenueUSD(protocolSide);
  }

  addPool(count: u8 = 1): void {
    this.protocol.totalPoolCount += count;
    this.save();
  }

  addUser(count: u8 = 1): void {
    this.protocol.cumulativeUniqueUsers += count;
    this.save();
  }

  loadVault(
    id: string,
    onCreate: ((vault: Vault, event: ethereum.Event) => void) | null = null
  ): Vault {
    return Vault.load(id, this, onCreate);
  }
}

export class Vault {
  vault: VaultSchema;
  protocol: YieldAggregator;

  private constructor(vault: VaultSchema, protocol: YieldAggregator) {
    this.vault = vault;
    this.protocol = protocol;
  }

  static load(
    id: string,
    protocol: YieldAggregator,
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
      onCreate(vaultWrapper, protocol.currentEvent());
    }
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
    this.vault.createdTimestamp = this.protocol.currentEvent().block.timestamp;
    this.vault.createdBlockNumber = this.protocol.currentEvent().block.number;

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

    // todo init tokens

    this.protocol.addPool();
  }

  setInputTokenBalance(balance: BigInt): void {
    this.vault.inputTokenBalance = balance;
    this.save();
  }

  setRewardToken(
    token: string,
    emissions: BigInt,
    emissionsUSD: BigDecimal
  ): void {
    // todo
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

  // deposit(
  //   event: ethereum.Event,
  //   account: Address,
  //   amount: BigInt,
  // ): Deposit {
  //   const id = `${ event.transaction.hash }-${ event.logIndex }`;

  //   const deposit = new Deposit(id);
  //   deposit.amount = amount;
  //   deposit.blockNumber = event.block.number;
  //   deposit.timestamp = event.block.timestamp;
  //   deposit.asset = this.vault.inputToken;
  //   deposit.vault = this.vault.id;

  //   deposit.save();
  //   this.protocol.
  //   Accounts.storeAccount(account, this.protocol.addUser);
  // }
}

class Accounts {
  static storeAccount(account: Address, addUser: () => void): void {
    let acc = Account.load(account.toHexString());
    if (acc) {
      return;
    }

    acc = new Account(account.toHexString());
    acc.save();
    addUser();
  }
}
