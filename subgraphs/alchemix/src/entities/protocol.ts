import { dataSource } from "@graphprotocol/graph-ts";
import { YieldAggregator } from "../../generated/schema";
import * as constants from "../common/constants";
import { Versions } from "../version";

export function getOrCreateProtocol(): YieldAggregator {
  const id = constants.ALCHEMIX_DEPLOYER;
  let protocol = YieldAggregator.load(id);
  if (protocol) {
    return updateVersions(protocol);
  }

  protocol = new YieldAggregator(id);
  protocol.name = constants.PROTOCOL_NAME;
  protocol.slug = constants.PROTOCOL_SLUG;
  protocol.network = dataSource.network().toUpperCase();
  protocol.type = constants.PROTOCOL_TYPE;
  protocol.totalValueLockedUSD = constants.BIGDECIMAL_ZERO;
  protocol.protocolControlledValueUSD = constants.BIGDECIMAL_ZERO;
  protocol.cumulativeSupplySideRevenueUSD = constants.BIGDECIMAL_ZERO;
  protocol.cumulativeProtocolSideRevenueUSD = constants.BIGDECIMAL_ZERO;
  protocol.cumulativeTotalRevenueUSD = constants.BIGDECIMAL_ZERO;
  protocol.cumulativeUniqueUsers = 0;
  protocol.totalPoolCount = 0;

  return updateVersions(protocol);
}

function updateVersions(protocol: YieldAggregator): YieldAggregator {
  protocol.schemaVersion = Versions.getSchemaVersion();
  protocol.subgraphVersion = Versions.getSubgraphVersion();
  protocol.methodologyVersion = Versions.getMethodologyVersion();
  protocol.save();
  return protocol;
}
