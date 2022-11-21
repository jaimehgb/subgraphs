import { ProtocolConfig } from "../sdk/protocols/config";
import { Versions } from "../versions";

/////////////////////////////
///// Protocol Specific /////
/////////////////////////////

export const PROTOCOL_NAME = "Alchemix Finance V1/V2";
export const PROTOCOL_SLUG = "alchemix-finance";
export const ALCHEMIX_DEPLOYER = "0x51e029a5ef288fb87c5e8dd46895c353ad9aaaec";

export const protocolConfig = new ProtocolConfig(
  ALCHEMIX_DEPLOYER,
  PROTOCOL_NAME,
  PROTOCOL_SLUG,
  Versions
);
