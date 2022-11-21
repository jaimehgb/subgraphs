import { Address } from "@graphprotocol/graph-ts";
import { _AuxData } from "../../generated/schema";
import { YieldAggregator, Vault } from "../sdk/protocols/yield";

const AUXDATA_ID = "aux_data";

export function getAlchemistCurrentVault(
  protocol: YieldAggregator,
  alchemist: Address
): Vault | null {
  const addr = getAlchemistCurrentVaultAddress(alchemist);
  if (!addr) {
    return null;
  }

  return protocol.loadVault(addr!);
}

export function getAlchemistCurrentVaultAddress(
  alchemist: Address
): string | null {
  const aux = _AuxData.load(AUXDATA_ID);
  if (!aux) {
    return null;
  }

  const index = aux.alchemists.indexOf(alchemist.toHexString());
  if (index == -1) {
    return null;
  }
  return aux.vaults[index];
}

export function setAlchemistVault(alchemist: Address, vault: Address): void {
  let aux = _AuxData.load(AUXDATA_ID);
  if (!aux) {
    aux = new _AuxData(AUXDATA_ID);
    aux.alchemists = [];
    aux.vaults = [];
  }

  const alchemists = aux.alchemists;
  const vaults = aux.vaults;

  const index = alchemists.indexOf(alchemist.toHexString());
  if (index == -1) {
    alchemists.push(alchemist.toHexString());
    vaults.push(vault.toHexString());
  } else {
    vaults[index] = vault.toHexString();
  }

  aux.alchemists = alchemists;
  aux.vaults = vaults;
  aux.save();
}
