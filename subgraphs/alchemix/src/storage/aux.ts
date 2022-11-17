import { Address } from "@graphprotocol/graph-ts";
import { _AuxData } from "../../generated/schema";

const AUXDATA_ID = "aux_data";

export function getAlchemistCurrentVault(alchemist: Address): string | null {
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
  alchemists.push(alchemist.toHexString());
  vaults.push(vault.toHexString());

  aux.alchemists = alchemists;
  aux.vaults = vaults;
  aux.save();
}
