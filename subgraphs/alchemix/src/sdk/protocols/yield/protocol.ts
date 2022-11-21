import {
  BigDecimal,
  Address,
  dataSource,
  ethereum,
} from "@graphprotocol/graph-ts";
import { Versions } from "../../../../../../deployment/context/interface";
import * as constants from "../../util/constants";
import { YieldAggregator as YieldAggregatorSchema } from "../../../../generated/schema";
import { TokenPricer, ProtocolConfigurer } from "../config";
import { Protocol } from "../protocol";
import { Accounts } from "../../common/accounts";
import { Vault } from "./vault";

export interface YieldAggregatorProtocol extends Protocol {
  addVault(count: u8): void;
}

// YieldAggregator is a wrapper around our YieldAggregator entity. It exposes
// additional functionality to load the entity, keep versions updated, take snapshots
// and safely modify values.
export class YieldAggregator implements YieldAggregatorProtocol {
  protocol: YieldAggregatorSchema;
  event: ethereum.Event;
  pricer: TokenPricer;

  private constructor(
    protocol: YieldAggregatorSchema,
    pricer: TokenPricer,
    event: ethereum.Event
  ) {
    this.protocol = protocol;
    this.event = event;
    this.pricer = pricer;
  }

  static load(
    conf: ProtocolConfigurer,
    pricer: TokenPricer,
    event: ethereum.Event
  ): YieldAggregator {
    let protocol = YieldAggregatorSchema.load(conf.getID());
    if (protocol) {
      const proto = new YieldAggregator(protocol, pricer, event);
      proto.setVersions(conf.getVersions());
      return proto;
    }

    protocol = new YieldAggregatorSchema(conf.getID());
    protocol.name = conf.getName();
    protocol.slug = conf.getSlug();
    protocol.network = dataSource.network().toUpperCase();
    protocol.type = constants.ProtocolType.YIELD;
    protocol.totalValueLockedUSD = constants.BIGDECIMAL_ZERO;
    protocol.protocolControlledValueUSD = constants.BIGDECIMAL_ZERO;
    protocol.cumulativeSupplySideRevenueUSD = constants.BIGDECIMAL_ZERO;
    protocol.cumulativeProtocolSideRevenueUSD = constants.BIGDECIMAL_ZERO;
    protocol.cumulativeTotalRevenueUSD = constants.BIGDECIMAL_ZERO;
    protocol.cumulativeUniqueUsers = 0;
    protocol.totalPoolCount = 0;

    const proto = new YieldAggregator(protocol, pricer, event);
    proto.setVersions(conf.getVersions());
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

  getCurrentEvent(): ethereum.Event {
    return this.event;
  }

  getTokenPricer(): TokenPricer {
    return this.pricer;
  }

  setTotalValueLocked(tvl: BigDecimal): void {
    this.protocol.totalValueLockedUSD = tvl;
    this.save();
  }

  addTotalValueLocked(tvl: BigDecimal): void {
    this.protocol.totalValueLockedUSD =
      this.protocol.totalValueLockedUSD.plus(tvl);
    this.save();
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

  addVault(count: u8 = 1): void {
    this.protocol.totalPoolCount += count;
    this.save();
  }

  addUser(count: u8 = 1): void {
    this.protocol.cumulativeUniqueUsers += count;
    this.save();
  }

  storeAccount(account: Address): void {
    const exists = Accounts.storeAccount(account);
    if (!exists) {
      this.addUser();
    }
  }

  loadVault(
    id: string,
    onCreate: ((vault: Vault, event: ethereum.Event) => void) | null = null
  ): Vault {
    return Vault.load(id, this, onCreate);
  }
}
